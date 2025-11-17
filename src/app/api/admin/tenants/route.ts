import { NextRequest, NextResponse } from "next/server";
import { listTenantsWithDomains, getTenantBySlug } from "@/lib/tenants";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const tenant = await getTenantBySlug(slug);
      if (!tenant) {
        return NextResponse.json(
          { error: "Tenant not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(tenant);
    }

    const tenants = await listTenantsWithDomains();
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, domain, subdomain } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

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

      // Check for duplicate slug
      if (tenantError.code === "23505" || tenantError.message.includes("duplicate") || tenantError.message.includes("unique constraint")) {
        return NextResponse.json(
          { error: "A tenant with this slug already exists. Please choose a different slug." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: tenantError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Delete tenant (cascade will handle related records)
    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("slug", slug);

    if (error) {
      console.error("Error deleting tenant:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
