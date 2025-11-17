import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient, upsertSubscriptionFromStripe, upsertInvoiceFromStripe } from '@/lib/stripe';

// Disable body parsing for webhook route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    // Handle the event
    switch (event.type) {
      // Subscription lifecycle events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        const deletedSubscription = event.data.object as Stripe.Subscription;
        const { createSupabaseServiceRoleClient } = await import('@/lib/supabase/clients');
        const supabase = createSupabaseServiceRoleClient();
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', deletedSubscription.id);
        break;

      // Invoice events
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        const paidInvoice = event.data.object as Stripe.Invoice;

        console.log(`[Webhook] Invoice paid: ${paidInvoice.id}`);
        console.log(`[Webhook] Invoice metadata:`, paidInvoice.metadata);

        // Save invoice to database
        await upsertInvoiceFromStripe(paidInvoice);

        // Check if this is a setup subscription payment and mark tenant as setup complete
        // Payment status is managed in the tenants.setup_complete field:
        // - false = hasn't paid (banner shows, access restricted)
        // - true = has paid (banner hides, full access granted)
        let tenantId = paidInvoice.metadata?.tenant_id;

        // If invoice doesn't have metadata, check the checkout session
        if (!tenantId && paidInvoice.id) {
          try {
            const session = await stripe.checkout.sessions.list({
              payment_intent: (paidInvoice as any).payment_intent,
              limit: 1,
            });

            if (session.data.length > 0) {
              const checkoutSession = session.data[0];
              console.log(`[Webhook] Found checkout session:`, checkoutSession.id);
              console.log(`[Webhook] Session metadata:`, checkoutSession.metadata);

              if (checkoutSession.metadata?.tenant_id && checkoutSession.metadata?.payment_type === 'setup_subscription') {
                tenantId = checkoutSession.metadata.tenant_id;
                console.log(`[Webhook] Using tenant_id from session metadata: ${tenantId}`);
              }
            }
          } catch (err) {
            console.error(`[Webhook] Error fetching checkout session:`, err);
          }
        }

        if (tenantId && (paidInvoice.metadata?.payment_type === 'setup' || paidInvoice.metadata?.payment_type === 'setup_subscription')) {
          const { createSupabaseServiceRoleClient } = await import('@/lib/supabase/clients');
          const supabase = createSupabaseServiceRoleClient();

          console.log(`[Webhook] Setup subscription payment completed for tenant ${tenantId}`);

          // Update tenant to mark setup as complete - this triggers banner to hide
          const { error: updateError } = await supabase
            .from('tenants')
            .update({
              setup_complete: true, // This is the key field that controls access
              pending_invoice_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenantId);

          if (updateError) {
            console.error(`[Webhook] Error updating tenant setup_complete:`, updateError);
          } else {
            console.log(`[Webhook] ✅ Tenant ${tenantId} marked as setup complete - banner will hide`);
          }

          // Verify the update
          const { data: verifyData } = await supabase
            .from('tenants')
            .select('setup_complete, pending_invoice_id')
            .eq('id', tenantId)
            .single();

          console.log(`[Webhook] Verification - setup_complete:`, verifyData?.setup_complete, 'pending_invoice_id:', verifyData?.pending_invoice_id);
        }
        break;

      case 'invoice.payment_failed':
      case 'invoice.finalized':
      case 'invoice.voided':
      case 'invoice.marked_uncollectible':
        await upsertInvoiceFromStripe(event.data.object as Stripe.Invoice);
        break;

      // PaymentIntent events for setup payments
      case 'payment_intent.succeeded':
        const succeededIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] PaymentIntent succeeded: ${succeededIntent.id}`);

        // Check if this payment intent is associated with a setup invoice
        const invoiceId = (succeededIntent as any).invoice;
        if (invoiceId) {
          const { createSupabaseServiceRoleClient } = await import('@/lib/supabase/clients');
          const supabase = createSupabaseServiceRoleClient();

          // Find tenant with this pending invoice
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('id, setup_complete')
            .eq('pending_invoice_id', invoiceId)
            .maybeSingle();

          if (tenantData && !tenantData.setup_complete) {
            console.log(`[Webhook] Marking tenant ${tenantData.id} as setup complete from PaymentIntent`);

            await supabase
              .from('tenants')
              .update({
                setup_complete: true,
                pending_invoice_id: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', tenantData.id);

            console.log(`[Webhook] ✅ Tenant ${tenantData.id} marked as setup complete via PaymentIntent`);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] PaymentIntent failed: ${failedIntent.id}`);
        console.log(`[Webhook] Error:`, failedIntent.last_payment_error?.message);
        break;

      // Optional: Handle trial ending notification (for sending reminders)
      case 'customer.subscription.trial_will_end':
        // You can add logic here to send email notifications
        console.log('Trial ending soon for subscription:', (event.data.object as Stripe.Subscription).id);
        break;

      // Optional: Handle upcoming invoices (for previewing next charge)
      case 'invoice.upcoming':
        // You can add logic here to notify customers about upcoming charges
        console.log('Upcoming invoice:', (event.data.object as Stripe.Invoice).id);
        break;

      // Handle checkout session completion (both one-time and subscription payments)
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionTenantId = session.metadata?.tenant_id;
        const paymentType = session.metadata?.payment_type;

        if (sessionTenantId) {
          const { createSupabaseServiceRoleClient } = await import('@/lib/supabase/clients');
          const supabase = createSupabaseServiceRoleClient();

          if (session.mode === 'payment' && session.payment_status === 'paid') {
            // One-time payment: Create invoice record
            let stripeInvoiceId: string | null = null;
            let hostedInvoiceUrl: string | null = null;
            let invoicePdf: string | null = null;

            // Try to get invoice from session if it exists
            if (session.invoice) {
              try {
                const invoice = await stripe.invoices.retrieve(session.invoice as string);
                stripeInvoiceId = invoice.id || null;
                hostedInvoiceUrl = invoice.hosted_invoice_url || null;
                invoicePdf = invoice.invoice_pdf || null;
              } catch (err) {
                console.warn('Could not retrieve invoice from session:', err);
              }
            }

            const invoiceData = {
              tenant_id: sessionTenantId,
              subscription_id: null, // One-time payments don't have subscriptions
              stripe_invoice_id: stripeInvoiceId,
              amount: session.amount_total || 0,
              currency: session.currency || 'usd',
              status: 'paid' as const,
              hosted_invoice_url: hostedInvoiceUrl,
              invoice_pdf: invoicePdf,
              period_start: null,
              period_end: null,
              paid_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            await supabase
              .from('invoices')
              .upsert({
                ...invoiceData,
                // Use a unique identifier: session_id or combination of tenant_id + amount + timestamp
                id: `onetime_${session.id}`,
              }, {
                onConflict: 'id',
              });

            // Mark setup as complete for one-time payments
            if (paymentType === 'setup') {
              await supabase
                .from('tenants')
                .update({
                  setup_complete: true,
                  pending_invoice_id: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', sessionTenantId);

              console.log(`[Webhook] ✅ Tenant ${sessionTenantId} marked as setup complete from one-time payment`);
            }
          } else if (session.mode === 'subscription') {
            // Subscription payment: Update subscription status
            // The subscription object is available in session.subscription
            if (session.subscription) {
              try {
                const subscription = await stripe.subscriptions.retrieve(
                  session.subscription as string
                );
                await upsertSubscriptionFromStripe(subscription);
                console.log(`[Webhook] Subscription updated from checkout.session.completed: ${subscription.id}`);
                console.log(`[Webhook] Session payment_status: ${session.payment_status}, payment_type: ${paymentType}`);

                // Mark setup as complete for setup_subscription payments
                // Check both payment_status and payment_type to be safe
                const isPaid = session.payment_status === 'paid' || session.status === 'complete';
                const isSetupPayment = paymentType === 'setup_subscription' || paymentType === 'setup';
                
                if (isPaid && isSetupPayment) {
                  console.log(`[Webhook] Marking tenant ${sessionTenantId} as setup complete from subscription checkout`);
                  
                  const { error: updateError, data: updateData } = await supabase
                    .from('tenants')
                    .update({
                      setup_complete: true,
                      pending_invoice_id: null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', sessionTenantId)
                    .select('setup_complete')
                    .single();

                  if (updateError) {
                    console.error(`[Webhook] Error updating tenant setup_complete:`, updateError);
                  } else {
                    console.log(`[Webhook] ✅ Tenant ${sessionTenantId} marked as setup complete. Verified:`, updateData?.setup_complete);
                  }
                } else {
                  console.log(`[Webhook] Not marking as complete - isPaid: ${isPaid}, isSetupPayment: ${isSetupPayment}`);
                }
              } catch (err) {
                console.error('[Webhook] Failed to update subscription from checkout:', err);
              }
            } else {
              console.warn(`[Webhook] Checkout session ${session.id} is subscription mode but has no subscription ID`);
            }
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

