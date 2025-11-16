import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/clients";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get tenant for this user
    const { data, error } = await supabase
      .from("tenant_users")
      .select(`
        tenant_id,
        tenant:tenant_id (
          name,
          slug,
          tenant_domains (
            domain,
            subdomain,
            is_primary
          )
        )
      `)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data || !data.tenant) {
      return NextResponse.json(
        { error: "No tenant found" },
        { status: 404 }
      );
    }

    // Get primary domain
    const tenant = data.tenant as any;
    const primaryDomain = tenant.tenant_domains?.find(
      (domain: any) => domain.is_primary
    ) ?? tenant.tenant_domains?.[0];

    if (!primaryDomain) {
      return NextResponse.json(
        { error: "No domain found for tenant" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tenantId: data.tenant_id,
      tenantDomain: primaryDomain.domain,
      slug: tenant.slug,
    });
  } catch (error) {
    console.error("Tenant fetch error:", error);
    return NextResponse.json(
      { error: "Failed to get tenant" },
      { status: 500 }
    );
  }
}
