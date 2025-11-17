import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenants';
import { getTenantSubscription, getStripeClient, getOrCreateStripeCustomer } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();

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

    // Get or create customer using user ID (ensures ONE customer per user)
    // Always use getOrCreateStripeCustomer to ensure consistency and proper user_id mapping
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email || undefined,
      tenant.name,
      tenant.id
    );
    
    console.log(`[Portal] Using customer ID: ${customerId} for user ${user.id}`);

    // Create portal session
    const stripe = getStripeClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Build return URL based on environment
    const isLocalhost = siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1');
    const returnUrl = isLocalhost
      ? `http://localhost:3000/tenant/${slug}/dashboard/billing`
      : `https://${slug}.${new URL(siteUrl).hostname.replace(/^www\./, '')}/dashboard/billing`;

    console.log(`[Portal] Creating portal session for customer ${customerId}, return URL: ${returnUrl}`);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`[Portal] Portal session created: ${session.url}`);

    return NextResponse.json({
      url: session.url,
    });

  } catch (error: any) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

