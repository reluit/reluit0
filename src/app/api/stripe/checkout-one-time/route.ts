import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenants';
import { getOrCreateStripeCustomer, getStripeClient } from '@/lib/stripe';

/**
 * API route for creating one-time payment checkout sessions
 * Use this for setup fees, one-time purchases, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const { priceId, slug } = await request.json();

    if (!priceId || !slug) {
      return NextResponse.json(
        { error: 'Price ID and slug are required' },
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

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      tenant.id,
      user.email,
      tenant.name
    );

    // Create checkout session for one-time payment
    const stripe = getStripeClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Build redirect URL based on environment
    // For localhost/vercel: use /[slug]/dashboard
    // For production with subdomains: use https://[slug].domain.com/dashboard
    const isLocalhost = siteUrl.includes('localhost') || siteUrl.includes('vercel.app');
    const successUrl = isLocalhost
      ? `${siteUrl}/${slug}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`
      : `https://${slug}.${new URL(siteUrl).hostname.replace(/^www\./, '')}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = isLocalhost
      ? `${siteUrl}/${slug}/dashboard/billing?canceled=true`
      : `https://${slug}.${new URL(siteUrl).hostname.replace(/^www\./, '')}/dashboard/billing?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: slug,
        payment_type: 'one_time',
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('One-time checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

