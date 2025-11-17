import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("range") || "30d";

    const supabase = createSupabaseServiceRoleClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === "90d") {
      startDate.setDate(startDate.getDate() - 90);
    } else if (timeRange === "1y") {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Fetch tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select(`
        id,
        name,
        slug,
        setup_complete,
        created_at,
        subscriptions(
          id,
          status,
          current_period_end,
          stripe_price_id
        )
      `);

    if (tenantsError) {
      throw tenantsError;
    }

    const totalTenants = tenants?.length || 0;
    const activeTenants = tenants?.filter((t) => t.setup_complete).length || 0;
    const newTenantsThisMonth = tenants?.filter((t) => {
      const createdAt = new Date(t.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }).length || 0;

    // Calculate subscription metrics
    const allSubscriptions = tenants?.flatMap((t) => t.subscriptions || []) || [];
    const activeSubscriptions = allSubscriptions.filter((s) => s.status === "active").length;
    const trialingSubscriptions = allSubscriptions.filter((s) => s.status === "trialing").length;
    const canceledSubscriptions = allSubscriptions.filter((s) => s.status === "canceled").length;

    // Calculate MRR (simplified - assuming $99/month for all active subscriptions)
    const mrr = activeSubscriptions * 9900; // $99 in cents
    const arr = mrr * 12;
    const totalRevenue = mrr * (totalTenants > 0 ? Math.max(1, Math.floor(totalTenants / 2)) : 0);

    // Generate revenue by month (mock data for now)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      revenueByMonth.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        revenue: Math.floor(mrr * (0.7 + Math.random() * 0.6)),
      });
    }

    // Top tenants by MRR
    const topTenants = tenants
      ?.filter((t) => t.subscriptions && t.subscriptions.some((s) => s.status === "active"))
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        mrr: 9900, // $99 in cents
        status: t.subscriptions?.[0]?.status || "inactive",
      })) || [];

    // Calculate monthly growth (mock for now)
    const monthlyGrowth = Math.floor(10 + Math.random() * 20);

    return NextResponse.json({
      totalTenants,
      activeTenants,
      newTenantsThisMonth,
      mrr,
      arr,
      totalRevenue,
      monthlyGrowth,
      subscriptionMetrics: {
        active: activeSubscriptions,
        trialing: trialingSubscriptions,
        canceled: canceledSubscriptions,
      },
      revenueByMonth,
      topTenants,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
