import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { getTenantBySlug } from '@/lib/tenants';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/clients';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const slug = searchParams.get('slug');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
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

    const stripe = getStripeClient();

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription'],
    });

    console.log(`[Check Status] Session ${sessionId}:`);
    console.log(`[Check Status]   mode: ${session.mode}`);
    console.log(`[Check Status]   payment_status: ${session.payment_status}`);
    console.log(`[Check Status]   metadata:`, session.metadata);

    // Check if payment was successful
    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    const paymentType = session.metadata?.payment_type;
    const isSetupPayment = paymentType === 'setup_subscription' || paymentType === 'setup';
    const sessionTenantId = session.metadata?.tenant_id || tenant.id;

    console.log(`[Check Status] Payment details:`, {
      isPaid,
      paymentType,
      isSetupPayment,
      sessionTenantId,
      mode: session.mode,
      status: session.status,
    });

    // For subscription mode, also check if subscription was created
    let subscriptionActive = false;
    if (session.mode === 'subscription' && session.subscription) {
      try {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      subscriptionActive = subscription.status === 'active' || subscription.status === 'trialing';
        console.log(`[Check Status] Subscription status: ${subscription.status}, active: ${subscriptionActive}`);
      } catch (err) {
        console.error('[Check Status] Error retrieving subscription:', err);
      }
    }

    // If payment is successful and it's a setup payment, mark tenant as complete
    if (isPaid && isSetupPayment && sessionTenantId) {
      console.log(`[Check Status] Payment confirmed! Marking tenant ${sessionTenantId} as setup complete`);

      // Mark setup as complete
      const supabase = createSupabaseServiceRoleClient();
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
        console.error('[Check Status] Error updating tenant:', updateError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to update tenant', 
            details: updateError.message,
            isPaid: true,
            message: 'Payment successful but failed to update tenant status',
          },
          { status: 500 }
        );
      }

      console.log(`[Check Status] ✅ Tenant ${sessionTenantId} marked as setup complete. Verified:`, updateData?.setup_complete);

      // Verify the update was successful
      const { data: verifyData } = await supabase
        .from('tenants')
        .select('setup_complete')
        .eq('id', sessionTenantId)
        .single();

      console.log(`[Check Status] Verification query result:`, verifyData);

      return NextResponse.json({
        success: true,
        isPaid: true,
        subscriptionActive,
        sessionId: session.id,
        paymentStatus: session.payment_status,
        status: session.status,
        mode: session.mode,
        tenantId: sessionTenantId,
        paymentType: paymentType,
        setupComplete: verifyData?.setup_complete || true,
        message: 'Payment verified and setup completed',
      });
    }

    // If payment is paid but not a setup payment, still return success but don't update
    if (isPaid) {
      return NextResponse.json({
        success: true,
        isPaid: true,
        subscriptionActive,
        sessionId: session.id,
        paymentStatus: session.payment_status,
        status: session.status,
        mode: session.mode,
        tenantId: sessionTenantId,
        paymentType: paymentType,
        message: 'Payment completed',
      });
    }

    return NextResponse.json({
      success: false,
      isPaid: false,
      subscriptionActive,
      sessionId: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
      mode: session.mode,
      tenantId: sessionTenantId,
      paymentType: paymentType,
      message: 'Payment not completed',
    });
  } catch (error: any) {
    console.error('[Check Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
