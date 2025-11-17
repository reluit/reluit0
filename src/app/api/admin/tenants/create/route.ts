import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { slugify } from "@/lib/slugify";

/**
 * POST /api/admin/tenants/create
 * Create a new tenant/client (for Zapier automation and API access)
 * 
 * This endpoint allows programmatic creation of tenants via API key authentication
 * 
 * Request Body:
 * {
 *   name: string (required) - Tenant name
 *   slug?: string (optional) - Custom slug (auto-generated if not provided)
 *   domain?: string (optional) - Custom domain
 *   subdomain?: string (optional) - Custom subdomain
 *   email?: string (optional) - Primary user email
 *   apiKey?: string (optional) - API key for authentication
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   tenant: { id, name, slug, ... }
 *   dashboardUrl: string
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get API key from header or body
    const apiKey = request.headers.get("x-api-key") || 
                   request.headers.get("authorization")?.replace("Bearer ", "") ||
                   (await request.json().then(body => body.apiKey).catch(() => null));

    // Verify API key (you should set this in environment variables)
    const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY;
    
    if (validApiKey && apiKey !== validApiKey) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, slug: customSlug, domain, subdomain, email } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Generate slug if not provided
    const slug = customSlug || slugify(name);

    // Check if slug already exists
    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingTenant) {
      return NextResponse.json(
        { error: `A tenant with slug "${slug}" already exists. Please provide a different slug.` },
        { status: 400 }
      );
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name,
        slug,
        setup_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Error creating tenant:", tenantError);
      
      if (tenantError.code === "23505" || tenantError.message.includes("duplicate")) {
        return NextResponse.json(
          { error: `A tenant with this slug already exists. Please choose a different slug.` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: tenantError.message },
        { status: 500 }
      );
    }

    // Create domain entry if provided
    if (domain || subdomain) {
      const { error: domainError } = await supabase
        .from("tenant_domains")
        .insert({
          tenant_id: tenant.id,
          domain: domain || null,
          subdomain: subdomain || null,
          is_primary: true,
          created_at: new Date().toISOString(),
        });

      if (domainError) {
        console.error("Error creating domain:", domainError);
        // Don't fail the request, just log the error
      }
    }

    // Create user if email provided
    let userId: string | null = null;
    if (email) {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("tenant_users")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (!existingUser) {
        // Create a new user entry
        const { data: newUser, error: userError } = await supabase
          .from("tenant_users")
          .insert({
            tenant_id: tenant.id,
            email,
            role: "owner",
            created_at: new Date().toISOString(),
          })
          .select("user_id")
          .single();

        if (userError) {
          console.error("Error creating user:", userError);
        } else {
          userId = newUser.user_id;
        }
      } else {
        userId = existingUser.user_id;
      }
    }

    // Build dashboard URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://reluit.com";
    const isLocalhost = siteUrl.includes("localhost");
    const dashboardUrl = isLocalhost
      ? `http://localhost:3000/tenant/${slug}/dashboard`
      : `https://${slug}.${new URL(siteUrl).hostname.replace(/^www\./, "")}/dashboard`;

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          created_at: tenant.created_at,
        },
        dashboardUrl,
        message: `Tenant "${name}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create tenant" },
      { status: 500 }
    );
  }
}

