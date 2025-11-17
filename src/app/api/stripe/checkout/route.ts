import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenants';
import { getOrCreateStripeCustomer, getStripeClient } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { slug, setupFeeAmount } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user || !user.email) {
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

    // Get or create Stripe customer using user ID (ensures one customer per user)
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      tenant.name,
      tenant.id
    );

    // Create checkout session
    const stripe = getStripeClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Build redirect URL based on environment
    const isLocalhost = siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1');

    // For localhost, use the /tenant/[slug]/dashboard/billing format
    // For production, use subdomain format
    const successUrl = isLocalhost
      ? `http://localhost:3000/tenant/${slug}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`
      : `https://${slug}.${new URL(siteUrl).hostname.replace(/^www\./, '')}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = isLocalhost
      ? `http://localhost:3000/tenant/${slug}/dashboard/billing?canceled=true`
      : `https://${slug}.${new URL(siteUrl).hostname.replace(/^www\./, '')}/dashboard/billing?canceled=true`;

    // Get environment variables for Stripe price IDs
    const recurringPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    const oneTimePriceId = process.env.NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID;

    if (!recurringPriceId) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_STRIPE_PRICE_ID not configured' },
        { status: 400 }
      );
    }

    // Prepare line items for checkout
    // Stripe Checkout with mode='subscription' supports MIXED cart (recurring + one-time)
    // Just add both price IDs as line items!
    const lineItems: any[] = [
      {
        price: recurringPriceId,  // Recurring subscription price
        quantity: 1,
      },
    ];

    // Add one-time setup fee as a separate line item
    // This is the CORRECT way - NOT using subscription_data.add_invoice_items
    if (oneTimePriceId) {
      lineItems.push({
        price: oneTimePriceId,  // One-time setup fee price
        quantity: 1,
      });
    }

    // Prepare minimal subscription metadata
    const subscriptionData: any = {
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: slug,
        payment_type: 'setup_subscription',
      },
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: slug,
        payment_type: 'setup_subscription',
      },
      subscription_data: {
        metadata: subscriptionData.metadata,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}


