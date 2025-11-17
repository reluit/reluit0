import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/clients';

/**
 * Get invoices for a user based on their email
 * This searches Stripe for all invoices associated with the user's email
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Not authenticated or email not found' },
        { status: 401 }
      );
    }

    const stripe = getStripeClient();

    // First, get all tenants for this user to find their customer IDs
    const supabase = createSupabaseServiceRoleClient();
    const { data: tenantUsers, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id, email')
      .eq('email', user.email);

    if (tenantError) {
      console.error('Error fetching tenant users:', tenantError);
      return NextResponse.json(
        { error: 'Failed to fetch tenant associations' },
        { status: 500 }
      );
    }

    if (!tenantUsers || tenantUsers.length === 0) {
      return NextResponse.json({
        invoices: [],
        message: 'No tenants found for this user',
      });
    }

    // Get all customer IDs for this user's tenants
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, tenant_id')
      .in('tenant_id', tenantUsers.map(tu => tu.tenant_id))
      .not('stripe_customer_id', 'is', null);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        invoices: [],
        message: 'No subscriptions found',
      });
    }

    // Get invoices from Stripe for all customer IDs
    const allInvoices: any[] = [];

    for (const subscription of subscriptions) {
      if (!subscription.stripe_customer_id) continue;

      try {
        // Get invoices from Stripe
        const params: any = {
          customer: subscription.stripe_customer_id,
          limit: 100,
        };

        // Use auto-pagination to get all invoices
        for await (const invoice of stripe.invoices.list(params)) {
          allInvoices.push({
            id: invoice.id,
            stripe_invoice_id: invoice.id,
            tenant_id: subscription.tenant_id,
            amount: invoice.amount_paid || invoice.amount_due,
            currency: invoice.currency,
            status: invoice.status,
            hosted_invoice_url: invoice.hosted_invoice_url,
            invoice_pdf: invoice.invoice_pdf,
            period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString()
              : null,
            period_end: invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString()
              : null,
            paid_at: invoice.status_transitions?.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
              : null,
            created_at: new Date(invoice.created * 1000).toISOString(),
            lines: invoice.lines?.data || [],
          });
        }
      } catch (error) {
        console.error(`Error fetching invoices for customer ${subscription.stripe_customer_id}:`, error);
      }
    }

    // Sort invoices by creation date (newest first)
    allInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      invoices: allInvoices,
      count: allInvoices.length,
    });

  } catch (error: any) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
