import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenants';
import { getTenantSubscription, getTenantInvoices, hasCompletedOneTimePayment, verifyCheckoutSession } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  console.log('\n========== /api/stripe/subscription - START ==========');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);

  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');
    const sessionId = searchParams.get('session_id');

    console.log('Query params:', { slug, sessionId });

    if (!slug) {
      console.log('ERROR: Slug is required');
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      console.log('ERROR: Not authenticated');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Get tenant
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      console.log('ERROR: Tenant not found for slug:', slug);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    console.log('Tenant found:', { id: tenant.id, name: tenant.name });

    // Get subscription and invoices
    console.log('Fetching subscription and invoices...');
    const subscription = await getTenantSubscription(tenant.id);
    const invoices = await getTenantInvoices(tenant.id);

    console.log('Subscription:', subscription ? `ID ${subscription.id}, Status ${subscription.status}` : 'null');
    console.log('Invoices count:', invoices.length);

    // Check one-time payment status using Stripe API directly
    const oneTimePriceId = process.env.NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID?.trim();
    console.log('One-time Price ID from env:', oneTimePriceId || 'NOT SET');

    let hasOneTimePayment = false;

    if (!oneTimePriceId) {
      console.log('ERROR: NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID not configured');
    } else {
      // If session_id is provided, verify it directly first (more reliable)
      if (sessionId) {
        console.log('\n>>> Verifying specific session_id:', sessionId);
        hasOneTimePayment = await verifyCheckoutSession(sessionId, tenant.id, oneTimePriceId);
        console.log('<<< Session verification result:', hasOneTimePayment);
      }

      // If session verification didn't confirm payment, check all sessions
      if (!hasOneTimePayment) {
        console.log('\n>>> Checking all sessions for tenant:', tenant.id);
        hasOneTimePayment = await hasCompletedOneTimePayment(tenant.id, oneTimePriceId);
        console.log('<<< Full session check result:', hasOneTimePayment);
      }
    }

    const response = {
      subscription,
      invoices,
      hasOneTimePayment,
    };

    console.log('\nFinal response:', {
      subscriptionId: response.subscription?.id || null,
      subscriptionStatus: response.subscription?.status || null,
      invoicesCount: response.invoices.length,
      hasOneTimePayment: response.hasOneTimePayment,
    });

    console.log('========== /api/stripe/subscription - END (200) ==========\n');

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('\n❌ Subscription fetch error:', error);
    console.error('Error stack:', error.stack);
    console.log('========== /api/stripe/subscription - END (500) ==========\n');

    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

