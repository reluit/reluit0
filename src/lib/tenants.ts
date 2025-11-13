import { randomUUID } from "crypto";

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from "./supabase/clients";
import { ROOT_DOMAIN } from "./env";
import { slugify } from "./slugify";

export interface TenantDomain {
  id: string;
  domain: string;
  subdomain: string | null;
  type: string;
  is_primary: boolean;
  connected: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  branding: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TenantWithDomains extends Tenant {
  domains: TenantDomain[];
}

type SupabaseTenantRow = Tenant & { updated_at: string };
type SupabaseTenantDomainRow = TenantDomain & { updated_at: string; tenant_id: string };

function mapTenantRow(row: SupabaseTenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    branding: row.branding,
    metadata: row.metadata,
    created_at: row.created_at,
  };
}

function mapTenantDomainRow(row: SupabaseTenantDomainRow): TenantDomain {
  return {
    id: row.id,
    domain: row.domain,
    subdomain: row.subdomain,
    type: row.type,
    is_primary: row.is_primary,
    connected: row.connected,
    metadata: row.metadata,
    created_at: row.created_at,
  };
}

export async function listTenantsWithDomains(): Promise<TenantWithDomains[]> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(
      `id, name, slug, branding, metadata, created_at, tenant_domains:tenant_domains(id, domain, subdomain, type, is_primary, connected, metadata, created_at)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load tenants: ${error.message}`);
  }

  return (
    data?.map((tenant: any) => ({
      ...mapTenantRow(tenant as unknown as SupabaseTenantRow),
      domains: (tenant.tenant_domains ?? []).map((domain: any) => mapTenantDomainRow(domain as SupabaseTenantDomainRow)),
    })) ?? []
  );
}

export async function getTenantBySlug(slug: string): Promise<TenantWithDomains | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(
      `id, name, slug, branding, metadata, created_at, tenant_domains:tenant_domains(id, domain, subdomain, type, is_primary, connected, metadata, created_at)`
    )
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to load tenant: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    ...mapTenantRow(data as unknown as SupabaseTenantRow),
    domains: (data.tenant_domains ?? []).map((domain: any) => mapTenantDomainRow(domain as SupabaseTenantDomainRow)),
  };
}

export async function getTenantByDomain(domain: string): Promise<TenantWithDomains | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_domains")
    .select(
      `tenant:tenant_id(id, name, slug, branding, metadata, created_at, tenant_domains:tenant_domains(id, domain, subdomain, type, is_primary, connected, metadata, created_at))`
    )
    .eq("domain", domain)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to look up domain: ${error.message}`);
  }

  if (!data || !data.tenant) {
    return null;
  }

  const tenant = data.tenant as any;

  return {
    ...mapTenantRow(tenant as unknown as SupabaseTenantRow),
    domains: (tenant.tenant_domains ?? []).map((domainRow: any) =>
      mapTenantDomainRow(domainRow as SupabaseTenantDomainRow)
    ),
  };
}

export function buildPrimarySubdomain(slug: string) {
  return `${slug}.${ROOT_DOMAIN}`;
}

async function slugExists(client: ReturnType<typeof createSupabaseServiceRoleClient>, slug: string) {
  const { data, error } = await client.from("tenants").select("id").eq("slug", slug).maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to validate slug: ${error.message}`);
  }

  return Boolean(data?.id);
}

async function domainExists(client: ReturnType<typeof createSupabaseServiceRoleClient>, domain: string) {
  const { data, error } = await client.from("tenant_domains").select("id").eq("domain", domain).maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to validate domain: ${error.message}`);
  }

  return Boolean(data?.id);
}

function generateFallbackSlug() {
  return `tenant-${randomUUID().slice(0, 8)}`;
}

async function ensureUniqueSlug(client: ReturnType<typeof createSupabaseServiceRoleClient>, base: string) {
  const initial = base || generateFallbackSlug();
  let candidate = initial;
  let increment = 1;

  while (await slugExists(client, candidate)) {
    candidate = `${initial}-${increment}`;
    increment += 1;

    if (increment > 50) {
      throw new Error("Unable to generate unique tenant slug. Please try a different name.");
    }
  }

  return candidate;
}

async function ensureUniqueDomain(client: ReturnType<typeof createSupabaseServiceRoleClient>, desired: string) {
  const initialSubdomain = desired.replace(`.${ROOT_DOMAIN}`, "");
  let candidateSubdomain = initialSubdomain;
  let increment = 1;

  while (await domainExists(client, `${candidateSubdomain}.${ROOT_DOMAIN}`)) {
    candidateSubdomain = `${initialSubdomain}-${increment}`;
    increment += 1;

    if (increment > 50) {
      throw new Error("Unable to generate unique tenant domain. Please try again.");
    }
  }

  return `${candidateSubdomain}.${ROOT_DOMAIN}`;
}

export interface CreateTenantInput {
  name: string;
  slug?: string;
  subdomain?: string;
  branding?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createTenantWithPrimaryDomain(input: CreateTenantInput): Promise<TenantWithDomains> {
  const supabase = createSupabaseServiceRoleClient();
  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.name);
  const uniqueSlug = await ensureUniqueSlug(supabase, baseSlug);

  const baseSubdomain = input.subdomain ? slugify(input.subdomain) : uniqueSlug;
  const primaryDomain = buildPrimarySubdomain(baseSubdomain);
  const uniqueDomain = await ensureUniqueDomain(supabase, primaryDomain);
  const subdomain = uniqueDomain.replace(`.${ROOT_DOMAIN}`, "");

  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: input.name,
      slug: uniqueSlug,
      branding: input.branding ?? {},
      metadata: input.metadata ?? {},
    })
    .select("id, name, slug, branding, metadata, created_at");

  if (tenantError || !tenantRow?.[0]) {
    throw new Error(tenantError?.message ?? "Failed to create tenant.");
  }

  const tenant = mapTenantRow(tenantRow[0] as SupabaseTenantRow);

  const { data: domainRow, error: domainError } = await supabase
    .from("tenant_domains")
    .insert({
      tenant_id: tenant.id,
      domain: uniqueDomain,
      subdomain,
      type: "subdomain",
      is_primary: true,
      connected: true,
      metadata: {},
    })
    .select("id, domain, subdomain, type, is_primary, connected, metadata, created_at");

  if (domainError || !domainRow?.[0]) {
    await supabase.from("tenants").delete().eq("id", tenant.id);
    throw new Error(domainError?.message ?? "Failed to create tenant domain.");
  }

  const domains = [
    mapTenantDomainRow({
      ...(domainRow[0] as SupabaseTenantDomainRow),
      tenant_id: tenant.id,
    }),
  ];

  return {
    ...tenant,
    domains,
  };
}

