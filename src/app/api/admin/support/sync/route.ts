import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { getCurrentUser } from "@/lib/auth";
import { fetchEmailsBySubject, getEmailById } from "@/lib/resend";

/**
 * This endpoint syncs emails from Resend that contain "edit request" in the subject
 * and creates support tickets for them
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Fetch emails with "edit request" in subject
    const emails = await fetchEmailsBySubject("edit request", 1000);

    let ticketsCreated = 0;
    let ticketsUpdated = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        // Get full email details
        const emailDetails = await getEmailById(email.id);
        
        const fromEmail = email.from || emailDetails?.from || "";
        const emailSubject = email.subject || emailDetails?.subject || "";
        const emailBody = emailDetails?.html || emailDetails?.text || email.text || email.html || "";
        const createdAt = email.created_at || emailDetails?.created_at || new Date().toISOString();

        // Combine email content for tenant name matching
        const emailContent = `${emailSubject} ${emailBody}`.toLowerCase();

        // First, try to find tenant by email
        const { data: tenantUser } = await supabase
          .from("tenant_users")
          .select("tenant_id, tenants(id, name, slug)")
          .eq("email", fromEmail)
          .single();

        let tenantId = tenantUser?.tenant_id || null;

        // If no tenant found by email, try matching by tenant name in email content
        if (!tenantId) {
          // Fetch all tenants to check their names
          const { data: allTenants } = await supabase
            .from("tenants")
            .select("id, name, slug");

          if (allTenants && allTenants.length > 0) {
            // Check if any tenant name appears in the email content
            for (const tenant of allTenants) {
              const tenantName = tenant.name.toLowerCase();
              const tenantSlug = tenant.slug.toLowerCase();
              
              // Check if tenant name or slug appears in email subject or body
              if (
                emailContent.includes(tenantName) ||
                emailContent.includes(tenantSlug) ||
                emailSubject.toLowerCase().includes(tenantName) ||
                emailSubject.toLowerCase().includes(tenantSlug)
              ) {
                tenantId = tenant.id;
                console.log(`Matched tenant "${tenant.name}" by name in email content`);
                break; // Use the first match
              }
            }
          }
        }

        // Check if ticket already exists for this email
        const { data: existingTicket } = await supabase
          .from("support_tickets")
          .select("id")
          .eq("resend_email_id", email.id)
          .single();

        if (existingTicket) {
          // Update existing ticket
          const { error: updateError } = await supabase
            .from("support_tickets")
            .update({
              subject: emailSubject,
              description: emailBody,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingTicket.id);

          if (!updateError) {
            ticketsUpdated++;
          } else {
            errors.push(`Failed to update ticket for email ${email.id}: ${updateError.message}`);
          }
        } else {
          // Create new ticket
          const { error: insertError } = await supabase
            .from("support_tickets")
            .insert({
              tenant_id: tenantId,
              subject: emailSubject,
              description: emailBody,
              email: fromEmail,
              resend_email_id: email.id,
              status: "open",
              priority: "medium",
              created_at: createdAt,
              updated_at: createdAt,
            });

          if (!insertError) {
            ticketsCreated++;
          } else {
            errors.push(`Failed to create ticket for email ${email.id}: ${insertError.message}`);
          }
        }
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        errors.push(`Error processing email ${email.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${emails.length} emails from Resend`,
      ticketsCreated,
      ticketsUpdated,
      totalEmails: emails.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error syncing tickets from Resend:", error);
    return NextResponse.json(
      { 
        error: "Failed to sync tickets from Resend",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
