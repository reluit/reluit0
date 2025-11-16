import { NextResponse } from "next/server";
import { signInByTenant } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenants";

export async function POST(request: Request) {
  try {
    const { slug, password } = await request.json();

    if (!slug || !password) {
      return NextResponse.json(
        { success: false, message: "Slug and password are required" },
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

    // Sign in with tenant ID and password
    try {
      await signInByTenant(tenant.id, password);
      
      return NextResponse.json({
        success: true,
        message: "Authenticated successfully",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Invalid password";
      
      // Check if error is due to email not being confirmed
      const isEmailNotConfirmed = 
        errorMessage.toLowerCase().includes("email") && 
        (errorMessage.toLowerCase().includes("confirm") || 
         errorMessage.toLowerCase().includes("verified") ||
         errorMessage.toLowerCase().includes("verification"));
      
      return NextResponse.json(
        { 
          success: false, 
          message: isEmailNotConfirmed 
            ? "Email not confirmed. Please check your email and click the verification link." 
            : errorMessage 
        },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Authentication failed" },
      { status: 500 }
    );
  }
}

