import Stripe from 'stripe';
import { createSupabaseServiceRoleClient } from './supabase/clients';

// Initialize Stripe
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
  });
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create Stripe customer for a tenant
 */
export async function getOrCreateStripeCustomer(
  tenantId: string,
  email?: string,
  name?: string
): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const stripe = getStripeClient();

  // Check if customer already exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .not('stripe_customer_id', 'is', null)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  // Get tenant info if email/name not provided
  if (!email || !name) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    if (tenant) {
      name = name || tenant.name;
    }

    // Get owner email if not provided
    if (!email) {
      const { data: owner } = await supabase
        .from('tenant_users')
        .select('email')
        .eq('tenant_id', tenantId)
        .eq('role', 'owner')
        .maybeSingle();

      email = owner?.email || undefined;
    }
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      tenant_id: tenantId,
    },
  });

  // Save customer ID to database
  await supabase
    .from('subscriptions')
    .upsert({
      tenant_id: tenantId,
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'tenant_id',
    });

  return customer.id;
}

/**
 * Get subscription for a tenant
 */
export async function getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  return data as TenantSubscription | null;
}

/**
 * Check if tenant has completed one-time payment using Stripe API
 */
export async function hasCompletedOneTimePayment(
  tenantId: string,
  oneTimePriceId: string
): Promise<boolean> {
  const stripe = getStripeClient();
  const supabase = createSupabaseServiceRoleClient();

  console.log(`[Stripe] ===== hasCompletedOneTimePayment START =====`);
  console.log(`[Stripe] Tenant ID: ${tenantId}`);
  console.log(`[Stripe] One-time Price ID: ${oneTimePriceId}`);

  // Get Stripe customer ID
  console.log(`[Stripe] Fetching Stripe customer ID for tenant ${tenantId}...`);
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .not('stripe_customer_id', 'is', null)
    .maybeSingle();

  if (subError) {
    console.error(`[Stripe] ERROR fetching subscription:`, subError);
    return false;
  }

  if (!subscription?.stripe_customer_id) {
    console.log(`[Stripe] No Stripe customer ID found for tenant ${tenantId}`);
    console.log(`[Stripe] ===== hasCompletedOneTimePayment END (false) =====`);
    return false;
  }

  const customerId = subscription.stripe_customer_id;
  console.log(`[Stripe] Found customer ID: ${customerId}`);

  try {
    // Query Stripe for completed checkout sessions with one-time payment
    console.log(`[Stripe] Listing checkout sessions for customer ${customerId}...`);
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 100,
    });

    console.log(`[Stripe] Found ${sessions.data.length} total sessions for customer ${customerId}`);

    // Check if any session is a completed one-time payment with the specified price
    for (const session of sessions.data) {
      console.log(`\n[Stripe] --- Checking Session ${session.id} ---`);
      console.log(`[Stripe]   mode: ${session.mode}`);
      console.log(`[Stripe]   payment_status: ${session.payment_status}`);
      console.log(`[Stripe]   metadata.tenant_id: ${session.metadata?.tenant_id}`);
      console.log(`[Stripe]   metadata.payment_type: ${session.metadata?.payment_type}`);

      const isOneTimeMode = session.mode === 'payment';
      const isPaid = session.payment_status === 'paid';
      const isCorrectTenant = session.metadata?.tenant_id === tenantId;
      const isOneTimePayment = session.metadata?.payment_type === 'one_time';

      console.log(`[Stripe]   Checks: oneTimeMode=${isOneTimeMode}, paid=${isPaid}, correctTenant=${isCorrectTenant}, oneTimePayment=${isOneTimePayment}`);

      if (
        isOneTimeMode &&
        isPaid &&
        isCorrectTenant &&
        isOneTimePayment
      ) {
        console.log(`[Stripe] ✓ Session matches all criteria! Verifying line items...`);

        // Verify the line items match the one-time price ID
        try {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100,
          });

          console.log(`[Stripe] Session ${session.id} has ${lineItems.data.length} line items:`);
          for (const item of lineItems.data) {
            console.log(`[Stripe]   - Price ID: ${item.price?.id}, Description: ${item.description}`);
          }

          const hasOneTimePrice = lineItems.data.some(
            item => {
              const priceId = item.price?.id;
              const matches = priceId === oneTimePriceId;
              console.log(`[Stripe]   Checking: ${priceId} === ${oneTimePriceId} ? ${matches}`);
              return matches;
            }
          );

          if (hasOneTimePrice) {
            console.log(`\n[Stripe] ✅ SUCCESS! One-time payment confirmed for tenant ${tenantId}`);
            console.log(`[Stripe] Session: ${session.id}`);
            console.log(`[Stripe] ===== hasCompletedOneTimePayment END (true) =====\n`);
            return true;
          } else {
            console.log(`[Stripe] ✗ Line items do not match one-time price ID`);
          }
        } catch (lineItemError) {
          console.error(`[Stripe] ✗ ERROR fetching line items for session ${session.id}:`, lineItemError);
        }
      }
    }

    console.log(`\n[Stripe] ❌ No matching one-time payment found for tenant ${tenantId}`);
    console.log(`[Stripe] ===== hasCompletedOneTimePayment END (false) =====\n`);
    return false;
  } catch (error) {
    console.error('[Stripe] ❌ ERROR checking one-time payment:', error);
    console.log(`[Stripe] ===== hasCompletedOneTimePayment END (false) =====\n`);
    return false;
  }
}

/**
 * Verify a specific checkout session is a paid one-time payment
 */
export async function verifyCheckoutSession(
  sessionId: string,
  tenantId: string,
  oneTimePriceId: string
): Promise<boolean> {
  const stripe = getStripeClient();

  console.log(`[Stripe] ===== verifyCheckoutSession START =====`);
  console.log(`[Stripe] Session ID: ${sessionId}`);
  console.log(`[Stripe] Tenant ID: ${tenantId}`);
  console.log(`[Stripe] One-time Price ID: ${oneTimePriceId}`);

  try {
    // Retrieve the specific session with expanded line items
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer'],
    });

    console.log(`[Stripe] Retrieved session ${session.id}:`);
    console.log(`[Stripe]   mode: ${session.mode}`);
    console.log(`[Stripe]   payment_status: ${session.payment_status}`);
    console.log(`[Stripe]   metadata.tenant_id: ${session.metadata?.tenant_id}`);
    console.log(`[Stripe]   metadata.payment_type: ${session.metadata?.payment_type}`);

    const isOneTimeMode = session.mode === 'payment';
    const isPaid = session.payment_status === 'paid';
    const isCorrectTenant = session.metadata?.tenant_id === tenantId;
    const isOneTimePayment = session.metadata?.payment_type === 'one_time';

    console.log(`[Stripe] Checks: oneTimeMode=${isOneTimeMode}, paid=${isPaid}, correctTenant=${isCorrectTenant}, oneTimePayment=${isOneTimePayment}`);

    if (
      isOneTimeMode &&
      isPaid &&
      isCorrectTenant &&
      isOneTimePayment
    ) {
      console.log(`[Stripe] Session matches all criteria! Verifying line items...`);

      if (!session.line_items) {
        console.log(`[Stripe] No line items in session, fetching them...`);
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
        session.line_items = lineItems;
      }

      console.log(`[Stripe] Session has ${session.line_items.data.length} line items:`);
      for (const item of session.line_items.data) {
        console.log(`[Stripe]   - Price ID: ${item.price?.id}, Description: ${item.description}`);
      }

      const hasOneTimePrice = session.line_items.data.some(
        item => {
          const priceId = item.price?.id;
          const matches = priceId === oneTimePriceId;
          console.log(`[Stripe]   Checking: ${priceId} === ${oneTimePriceId} ? ${matches}`);
          return matches;
        }
      );

      if (hasOneTimePrice) {
        console.log(`\n[Stripe] ✅ SUCCESS! Session verified as paid one-time payment`);
        console.log(`[Stripe] ===== verifyCheckoutSession END (true) =====\n`);
        return true;
      } else {
        console.log(`[Stripe] ✗ Line items do not match one-time price ID`);
        console.log(`[Stripe] ===== verifyCheckoutSession END (false) =====\n`);
        return false;
      }
    } else {
      console.log(`[Stripe] ✗ Session does not match criteria`);
      console.log(`[Stripe] ===== verifyCheckoutSession END (false) =====\n`);
      return false;
    }
  } catch (error) {
    console.error(`[Stripe] ❌ ERROR verifying session ${sessionId}:`, error);
    console.log(`[Stripe] ===== verifyCheckoutSession END (false) =====\n`);
    return false;
  }
}

/**
 * Create or update subscription from Stripe webhook
 */
export async function upsertSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const tenantId = stripeSubscription.metadata?.tenant_id;

  if (!tenantId) {
    throw new Error('Tenant ID not found in subscription metadata');
  }

  const subscriptionData = {
    tenant_id: tenantId,
    stripe_subscription_id: stripeSubscription.id,
    stripe_customer_id: stripeSubscription.customer as string,
    stripe_price_id: stripeSubscription.items.data[0]?.price.id || null,
    status: mapStripeStatusToDb(stripeSubscription.status),
    current_period_start: (stripeSubscription as any).current_period_start
      ? new Date((stripeSubscription as any).current_period_start * 1000).toISOString()
      : null,
    current_period_end: (stripeSubscription as any).current_period_end
      ? new Date((stripeSubscription as any).current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    canceled_at: stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
      : null,
    trial_start: stripeSubscription.trial_start
      ? new Date(stripeSubscription.trial_start * 1000).toISOString()
      : null,
    trial_end: stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000).toISOString()
      : null,
    metadata: stripeSubscription.metadata || {},
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'stripe_subscription_id',
    });
}

/**
 * Create or update invoice from Stripe webhook
 */
export async function upsertInvoiceFromStripe(
  stripeInvoice: Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const tenantId = stripeInvoice.metadata?.tenant_id;

  if (!tenantId) {
    // Try to get tenant from subscription
    if (stripeInvoice.subscription) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tenant_id')
        .eq('stripe_subscription_id', stripeInvoice.subscription as string)
        .maybeSingle();

      if (subscription) {
        const invoiceData = {
          tenant_id: subscription.tenant_id,
          subscription_id: null, // Will be set if subscription exists
          stripe_invoice_id: stripeInvoice.id,
          amount: stripeInvoice.amount_paid || stripeInvoice.amount_due,
          currency: stripeInvoice.currency,
          status: mapStripeInvoiceStatusToDb(stripeInvoice.status),
          hosted_invoice_url: stripeInvoice.hosted_invoice_url,
          invoice_pdf: stripeInvoice.invoice_pdf,
          period_start: stripeInvoice.period_start
            ? new Date(stripeInvoice.period_start * 1000).toISOString()
            : null,
          period_end: stripeInvoice.period_end
            ? new Date(stripeInvoice.period_end * 1000).toISOString()
            : null,
          paid_at: stripeInvoice.status_transitions?.paid_at
            ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        };

        // Get subscription_id if exists
        if (stripeInvoice.subscription) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', stripeInvoice.subscription as string)
            .maybeSingle();

          if (sub) {
            invoiceData.subscription_id = sub.id;
          }
        }

        await supabase
          .from('invoices')
          .upsert(invoiceData, {
            onConflict: 'stripe_invoice_id',
          });
        return;
      }
    }
    throw new Error('Tenant ID not found in invoice metadata or subscription');
  }

  const invoiceData = {
    tenant_id: tenantId,
    subscription_id: null,
    stripe_invoice_id: stripeInvoice.id,
    amount: stripeInvoice.amount_paid || stripeInvoice.amount_due,
    currency: stripeInvoice.currency,
    status: mapStripeInvoiceStatusToDb(stripeInvoice.status),
    hosted_invoice_url: stripeInvoice.hosted_invoice_url,
    invoice_pdf: stripeInvoice.invoice_pdf,
    period_start: stripeInvoice.period_start
      ? new Date(stripeInvoice.period_start * 1000).toISOString()
      : null,
    period_end: stripeInvoice.period_end
      ? new Date(stripeInvoice.period_end * 1000).toISOString()
      : null,
    paid_at: stripeInvoice.status_transitions?.paid_at
      ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  // Get subscription_id if exists
  if (stripeInvoice.subscription) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeInvoice.subscription as string)
      .maybeSingle();

    if (sub) {
      invoiceData.subscription_id = sub.id;
    }
  }

  await supabase
    .from('invoices')
    .upsert(invoiceData, {
      onConflict: 'stripe_invoice_id',
    });
}

/**
 * Get invoices for a tenant
 */
export async function getTenantInvoices(tenantId: string): Promise<Invoice[]> {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  return (data || []) as Invoice[];
}

/**
 * Map Stripe subscription status to database status
 */
function mapStripeStatusToDb(status: Stripe.Subscription.Status): TenantSubscription['status'] {
  const statusMap: Record<string, TenantSubscription['status']> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    trialing: 'trialing',
    incomplete: 'inactive',
    incomplete_expired: 'inactive',
    unpaid: 'inactive',
    paused: 'inactive',
  };

  return statusMap[status] || 'inactive';
}

/**
 * Map Stripe invoice status to database status
 */
function mapStripeInvoiceStatusToDb(status: Stripe.Invoice.Status | null): Invoice['status'] {
  if (!status) return 'open';

  const statusMap: Record<string, Invoice['status']> = {
    paid: 'paid',
    open: 'open',
    void: 'void',
    uncollectible: 'uncollectible',
    draft: 'open',
  };

  return statusMap[status] || 'open';
}

