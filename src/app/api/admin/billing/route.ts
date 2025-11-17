import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { getStripeClient } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const timeRange = searchParams.get("range") || "30d";

    const supabase = createSupabaseServiceRoleClient();
    const stripe = getStripeClient();

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    if (timeRange === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // First, try to get invoices from our database (synced from Stripe webhooks)
    const { data: dbInvoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        id,
        amount,
        currency,
        status,
        created_at,
        hosted_invoice_url,
        stripe_invoice_id,
        period_start,
        period_end,
        paid_at,
        tenant:tenants(
          id,
          name,
          slug
        )
      `)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    // If we have invoices in DB, use them. Otherwise, fetch from Stripe
    let allInvoices: any[] = [];

    if (dbInvoices && dbInvoices.length > 0) {
      // Use database invoices
      allInvoices = dbInvoices.map((inv: any) => ({
        id: inv.id,
        stripe_invoice_id: inv.stripe_invoice_id,
        tenant_id: inv.tenant?.id || null,
        tenantName: inv.tenant?.name || "Unknown",
        slug: inv.tenant?.slug || "",
        amount: inv.amount || 0,
        currency: inv.currency || "usd",
        status: inv.status === "paid" ? "paid" : inv.status === "open" ? "open" : inv.status === "void" ? "void" : "uncollectible",
        hosted_invoice_url: inv.hosted_invoice_url,
        period_start: inv.period_start,
        period_end: inv.period_end,
        paid_at: inv.paid_at,
        created_at: inv.created_at,
        due_date: inv.period_end || inv.created_at,
      }));
    } else {
      // Fallback: Fetch from Stripe directly
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          tenant_id,
          stripe_customer_id,
          stripe_subscription_id,
          tenants(
            id,
            name,
            slug
          )
        `);

      const customerIds = subscriptions
        ?.filter((s) => s.stripe_customer_id)
        .map((s) => s.stripe_customer_id) || [];

      for (const customerId of customerIds) {
        try {
          const stripeInvoices = await stripe.invoices.list({
            customer: customerId,
            limit: 100,
            created: {
              gte: Math.floor(startDate.getTime() / 1000),
            },
          });

          for (const invoice of stripeInvoices.data) {
            const subscription = subscriptions?.find(
              (s) => s.stripe_customer_id === customerId
            );

            if (subscription) {
              allInvoices.push({
                id: invoice.id,
                stripe_invoice_id: invoice.id,
                tenant_id: subscription.tenant_id,
                tenantName: (subscription.tenants as any)?.name || "Unknown",
                slug: (subscription.tenants as any)?.slug || "",
                amount: invoice.amount_paid || invoice.amount_due || 0,
                currency: invoice.currency || "usd",
                status: invoice.status === "paid" ? "paid" : invoice.status === "open" ? "open" : invoice.status === "void" ? "void" : "uncollectible",
                hosted_invoice_url: invoice.hosted_invoice_url,
                period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
                period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
                paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null,
                created_at: new Date(invoice.created * 1000).toISOString(),
                due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : new Date(invoice.created * 1000).toISOString(),
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching invoices for customer ${customerId}:`, error);
        }
      }
    }

    // Fetch subscriptions for MRR calculation
    const { data: subscriptions, error: subsError } = await supabase
      .from("subscriptions")
      .select(`
        id,
        status,
        tenant_id,
        stripe_customer_id,
        stripe_subscription_id,
        tenants(
          id,
          name,
          slug
        )
      `);

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
    }

    // Calculate MRR from active subscriptions
    let totalMRR = 0;
    for (const sub of subscriptions || []) {
      if (sub.status === "active" && sub.stripe_subscription_id) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
          if (stripeSub.items.data.length > 0) {
            const price = stripeSub.items.data[0].price;
            if (price.unit_amount) {
              totalMRR += price.unit_amount;
            }
          }
        } catch (error) {
          console.error(`Error fetching subscription ${sub.stripe_subscription_id}:`, error);
        }
      }
    }

    const totalARR = totalMRR * 12;
    const totalRevenue = allInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const subscriptionMetrics = {
      active: subscriptions?.filter((s) => s.status === "active").length || 0,
      trialing: subscriptions?.filter((s) => s.status === "trialing").length || 0,
      canceled: subscriptions?.filter((s) => s.status === "canceled").length || 0,
      pastDue: subscriptions?.filter((s) => s.status === "past_due").length || 0,
    };

    // Filter invoices based on filter parameter
    let filteredInvoices = allInvoices;
    if (filter === "paid") {
      filteredInvoices = filteredInvoices.filter((inv) => inv.status === "paid");
    } else if (filter === "overdue") {
      filteredInvoices = filteredInvoices.filter((inv) => {
        if (inv.status !== "open") return false;
        const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at);
        return dueDate < now;
      });
    } else if (filter === "pending") {
      filteredInvoices = filteredInvoices.filter((inv) => inv.status === "open");
    }

    // Process overdue invoices
    const overdueInvoices = allInvoices
      .filter((inv) => {
        if (inv.status !== "open") return false;
        const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at);
        const daysSinceDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceDue > 0;
      })
      .map((inv) => ({
        id: inv.id,
        tenantName: inv.tenantName,
        slug: inv.slug,
        amount: inv.amount,
        currency: inv.currency,
        dueDate: inv.due_date || inv.created_at,
        status: inv.status,
      }));

    // Process recent invoices for display
    const recentInvoices = filteredInvoices
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)
      .map((inv) => ({
      id: inv.id,
        tenantName: inv.tenantName,
        slug: inv.slug,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      createdAt: inv.created_at,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      }));

    // Get customer details for better insights
    const customerDetails = subscriptions?.map((sub) => ({
      tenantId: sub.tenant_id,
      tenantName: (sub.tenants as any)?.name || "Unknown",
      slug: (sub.tenants as any)?.slug || "",
      status: sub.status,
      stripeCustomerId: sub.stripe_customer_id,
      stripeSubscriptionId: sub.stripe_subscription_id,
    })) || [];

    return NextResponse.json({
      totalMRR,
      totalARR,
      totalRevenue,
      activeSubscriptions: subscriptionMetrics.active,
      overdueInvoices,
      recentInvoices,
      subscriptionMetrics,
      customerDetails,
    });
  } catch (error) {
    console.error("Error fetching billing data:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing data" },
      { status: 500 }
    );
  }
}
