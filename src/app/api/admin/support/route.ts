import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const priority = searchParams.get("priority") || "all";

    const supabase = createSupabaseServiceRoleClient();

    // Fetch tickets from database
    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select(`
        id,
        tenant_id,
        subject,
        description,
        status,
        priority,
        email,
        resend_email_id,
        notes,
        created_at,
        updated_at,
        tenants(
          id,
          name,
          slug
        )
      `)
      .order("created_at", { ascending: false });

    if (ticketsError) {
      throw ticketsError;
    }

    // Transform tickets to include tenant info
    const transformedTickets = (tickets || []).map((ticket: any) => ({
      id: ticket.id,
      tenantName: ticket.tenants?.name || "Unknown",
      tenantSlug: ticket.tenants?.slug || "",
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      email: ticket.email,
      resendEmailId: ticket.resend_email_id,
      notes: ticket.notes,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    }));

    // Filter by status
    let filteredTickets = transformedTickets;
    if (status !== "all") {
      filteredTickets = filteredTickets.filter((t) => t.status === status);
    }

    // Filter by priority
    if (priority !== "all") {
      filteredTickets = filteredTickets.filter((t) => t.priority === priority);
    }

    return NextResponse.json(filteredTickets);
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ticketId, status, priority, notes } = body;

    const supabase = createSupabaseServiceRoleClient();

    if (action === "sync_from_resend") {
      // Redirect to the sync endpoint
      return NextResponse.json({ 
        error: "Please use /api/admin/support/sync endpoint for syncing",
        redirect: "/api/admin/support/sync"
      }, { status: 400 });
    }

    if (action === "update") {
      if (!ticketId) {
        return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (notes !== undefined) updateData.notes = notes;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true, ticket: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating support ticket:", error);
    return NextResponse.json(
      { error: "Failed to update support ticket" },
      { status: 500 }
    );
  }
}

