import { NextResponse } from "next/server";
import { getTenantOwnerEmail } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenants";
import { createSupabaseServerClient } from "@/lib/supabase/clients";

export async function POST(request: Request) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Slug is required" },
        { status: 400 }
      );
    }

    // Get tenant by slug
    const tenant = await getTenantBySlug(slug);
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    // Get tenant owner email
    const email = await getTenantOwnerEmail(tenant.id);
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: "No email found for tenant owner" },
        { status: 404 }
      );
    }

    // Resend verification email
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://reluit.com"}/auth/confirm`,
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message || "Failed to resend verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}

