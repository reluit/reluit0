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
      case 'invoice.payment_failed':
      case 'invoice.finalized':
      case 'invoice.voided':
      case 'invoice.marked_uncollectible':
        await upsertInvoiceFromStripe(event.data.object as Stripe.Invoice);
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
        const tenantId = session.metadata?.tenant_id;

        if (tenantId) {
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
              tenant_id: tenantId,
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
          } else if (session.mode === 'subscription') {
            // Subscription payment: Update subscription status
            // The subscription object is available in session.subscription
            if (session.subscription) {
              try {
                const subscription = await stripe.subscriptions.retrieve(
                  session.subscription as string
                );
                await upsertSubscriptionFromStripe(subscription);
                console.log('Subscription updated from checkout.session.completed:', subscription.id);
              } catch (err) {
                console.error('Failed to update subscription from checkout:', err);
              }
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

