import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenants';
import { getTenantSubscription, getStripeClient, getOrCreateStripeCustomer } from '@/lib/stripe';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/clients';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get tenant
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get subscription from database
    const subscription = await getTenantSubscription(tenant.id);

    // Get or create customer using user ID (ensures one customer per user)
    const supabase = createSupabaseServiceRoleClient();
    const stripe = getStripeClient();
    let invoices: any[] = [];

    try {
      // Get or create customer using user ID (ensures ONE customer per user)
      // This function guarantees one customer per user_id, so we only need to fetch from one customer
      const customerId = await getOrCreateStripeCustomer(
        user.id,
        user.email || undefined,
        tenant.name,
        tenant.id
      );
      
      console.log(`[Subscription] Using customer ID: ${customerId} for user ${user.id}`);
      
      // Fetch invoices from this customer (should be the only one for this user_id)
      const stripeInvoices = await stripe.invoices.list({
        customer: customerId,
        limit: 50, // Limit for faster loading
      });
      
      console.log(`[Subscription] Found ${stripeInvoices.data.length} invoices for customer ${customerId}`);
      
      const allInvoices = stripeInvoices.data;

      // Transform Stripe invoices to our format
      invoices = allInvoices.map(invoice => ({
          id: invoice.id,
          stripe_invoice_id: invoice.id,
          tenant_id: tenant.id,
          subscription_id: null, // Will be set below if subscription exists
          amount: invoice.amount_paid || invoice.amount_due || 0,
          currency: invoice.currency || 'usd',
          status: invoice.status === 'paid' ? 'paid' : invoice.status === 'open' ? 'open' : invoice.status === 'void' ? 'void' : 'uncollectible',
          hosted_invoice_url: invoice.hosted_invoice_url,
          invoice_pdf: invoice.invoice_pdf,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null,
          created_at: new Date(invoice.created * 1000).toISOString(),
      }));

      // Link invoices to subscriptions if they have a subscription
      for (const invoice of invoices) {
        if (invoice.stripe_invoice_id) {
          try {
            const fullInvoice = await stripe.invoices.retrieve(invoice.stripe_invoice_id, {
              expand: ['subscription'],
            });
            // subscription can be a string ID or a Subscription object
            const subscriptionId = typeof (fullInvoice as any).subscription === 'string' 
              ? (fullInvoice as any).subscription 
              : (fullInvoice as any).subscription?.id;
            
            if (subscriptionId) {
              const { data: sub } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('stripe_subscription_id', subscriptionId)
                .maybeSingle();
              if (sub) {
                invoice.subscription_id = sub.id;
              }
            }
          } catch (err) {
            console.error(`[Subscription] Error linking subscription for invoice ${invoice.id}:`, err);
          }
        }
      }

      // Sort by created_at descending (newest first)
      invoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error(`[Subscription] Error fetching invoices from Stripe:`, error);
      // Fallback to database invoices if Stripe fetch fails
      const { data: dbInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
      invoices = dbInvoices || [];
    }

    // Check setup completion status
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('setup_complete')
      .eq('id', tenant.id)
      .single();

    let setupComplete = tenantData?.setup_complete || false;

    // Fallback: If database says incomplete but we have an active subscription or paid invoices,
    // verify with Stripe and update database if needed
    if (!setupComplete && (subscription?.status === 'active' || subscription?.status === 'trialing' || invoices.some(inv => inv.status === 'paid'))) {
      console.log(`[Subscription] Database shows incomplete but subscription/invoices exist. Verifying with Stripe...`);
      
      try {
        const stripe = getStripeClient();
        const customerId = await getOrCreateStripeCustomer(user.id, user.email || undefined, tenant.name, tenant.id);
        
        // Check for completed checkout sessions
        const sessions = await stripe.checkout.sessions.list({
          customer: customerId,
          limit: 10,
        });

        const hasPaidSetupSession = sessions.data.some(session => {
          const isPaid = session.payment_status === 'paid' || session.status === 'complete';
          const isSetupPayment = session.metadata?.payment_type === 'setup_subscription' || session.metadata?.payment_type === 'setup';
          const isCorrectTenant = session.metadata?.tenant_id === tenant.id;
          return isPaid && isSetupPayment && isCorrectTenant;
        });

        if (hasPaidSetupSession) {
          console.log(`[Subscription] Found paid setup session in Stripe. Updating database...`);
          const { error: updateError } = await supabase
            .from('tenants')
            .update({
              setup_complete: true,
              pending_invoice_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenant.id);

          if (!updateError) {
            setupComplete = true;
            console.log(`[Subscription] ✅ Tenant ${tenant.id} marked as setup complete via fallback check`);
          } else {
            console.error(`[Subscription] Error updating tenant:`, updateError);
          }
        }
      } catch (error) {
        console.error(`[Subscription] Error in fallback check:`, error);
      }
    }

    return NextResponse.json({
      subscription,
      invoices,
      setupComplete,
    });

  } catch (error: any) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}



