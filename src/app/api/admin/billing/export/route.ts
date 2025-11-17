import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/admin/billing/export
 * Export billing data as CSV
 * 
 * Query params:
 * - format: 'csv' | 'json' (default: 'csv')
 * - filter: 'all' | 'paid' | 'overdue' | 'pending'
 * - range: '30d' | '90d' | '1y'
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const filter = searchParams.get("filter") || "all";
    const timeRange = searchParams.get("range") || "30d";

    const supabase = createSupabaseServiceRoleClient();

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

    // Fetch invoices
    const { data: dbInvoices } = await supabase
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
      .order("created_at", { ascending: false });

    if (!dbInvoices) {
      return NextResponse.json({ error: "No invoices found" }, { status: 404 });
    }

    // Filter invoices
    let filteredInvoices = dbInvoices;
    if (filter === "paid") {
      filteredInvoices = filteredInvoices.filter((inv) => inv.status === "paid");
    } else if (filter === "overdue") {
      filteredInvoices = filteredInvoices.filter((inv) => {
        if (inv.status !== "open") return false;
        const dueDate = inv.period_end ? new Date(inv.period_end) : new Date(inv.created_at);
        return dueDate < now;
      });
    } else if (filter === "pending") {
      filteredInvoices = filteredInvoices.filter((inv) => inv.status === "open");
    }

    if (format === "json") {
      return NextResponse.json({
        invoices: filteredInvoices.map((inv: any) => ({
          id: inv.id,
          tenantName: inv.tenant?.name || "Unknown",
          slug: inv.tenant?.slug || "",
          amount: inv.amount / 100,
          currency: inv.currency,
          status: inv.status,
          createdAt: inv.created_at,
          periodStart: inv.period_start,
          periodEnd: inv.period_end,
          paidAt: inv.paid_at,
          invoiceUrl: inv.hosted_invoice_url,
        })),
      });
    }

    // Generate CSV
    const csvHeaders = [
      "Invoice ID",
      "Tenant Name",
      "Slug",
      "Amount",
      "Currency",
      "Status",
      "Created At",
      "Period Start",
      "Period End",
      "Paid At",
      "Invoice URL",
    ];

    const csvRows = filteredInvoices.map((inv: any) => [
      inv.id,
      `"${(inv.tenant?.name || "Unknown").replace(/"/g, '""')}"`,
      inv.tenant?.slug || "",
      (inv.amount / 100).toFixed(2),
      inv.currency,
      inv.status,
      new Date(inv.created_at).toISOString(),
      inv.period_start ? new Date(inv.period_start).toISOString() : "",
      inv.period_end ? new Date(inv.period_end).toISOString() : "",
      inv.paid_at ? new Date(inv.paid_at).toISOString() : "",
      inv.hosted_invoice_url || "",
    ]);

    const csv = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="billing-export-${filter}-${timeRange}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting billing data:", error);
    return NextResponse.json(
      { error: "Failed to export billing data" },
      { status: 500 }
    );
  }
}

