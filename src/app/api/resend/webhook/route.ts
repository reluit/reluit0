import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";

/**
 * Resend webhook endpoint to receive emails
 * Configure this URL in your Resend dashboard under Webhooks
 * 
 * When an email is received with "edit request" in the subject,
 * it will automatically create a support ticket
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature if configured
    // const signature = request.headers.get("resend-signature");
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const supabase = createSupabaseServiceRoleClient();

    // Resend webhook payload structure
    // Check Resend docs for exact structure
    const emailData = body.data || body;
    
    // Check if subject contains "edit request"
    const subject = emailData.subject?.toLowerCase() || "";
    if (!subject.includes("edit request")) {
      return NextResponse.json({ success: true, message: "Not an edit request email" });
    }

    // Extract email information
    const fromEmail = emailData.from || emailData.from_email || "";
    const emailId = emailData.id || emailData.email_id || "";
    const emailSubject = emailData.subject || "";
    const emailBody = emailData.body || emailData.text || emailData.html || "";
    const createdAt = emailData.created_at || new Date().toISOString();

    // Try to find tenant by email
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id, tenants(id, name, slug)")
      .eq("email", fromEmail)
      .single();

    const tenantId = tenantUser?.tenant_id || null;

    // Create or update support ticket
    const { data: existingTicket } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("resend_email_id", emailId)
      .single();

    if (existingTicket) {
      // Update existing ticket
      await supabase
        .from("support_tickets")
        .update({
          description: emailBody,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTicket.id);
    } else {
      // Create new ticket
      await supabase
        .from("support_tickets")
        .insert({
          tenant_id: tenantId,
          subject: emailSubject,
          description: emailBody,
          email: fromEmail,
          resend_email_id: emailId,
          status: "open",
          priority: "medium",
          created_at: createdAt,
          updated_at: createdAt,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

