import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getCurrentUser, getUserTenantAccess, isTenantClaimed } from "@/lib/auth";
import { getTenantDashboardData } from "@/lib/analytics";
import { getTenantByDomain } from "@/lib/tenants";

import { ClaimPage } from "../_components/claim-page";
import { TenantDashboard } from "../_components/tenant-dashboard";

// Force dynamic rendering - this page needs searchParams at runtime
export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface DomainTenantPageProps {
  searchParams: Promise<{
    domain?: string;
  }>;
}

export default async function DomainTenantPage({ searchParams }: DomainTenantPageProps) {
  // Get domain from searchParams (set by middleware rewrite)
  const params = await searchParams;
  let domain = typeof params.domain === "string" ? params.domain : undefined;
  
  // Fallback: get from headers (set by middleware as backup)
  if (!domain) {
    const headersList = await headers();
    domain = headersList.get("x-tenant-domain") ?? undefined;
  }

  if (!domain) {
    console.error("DomainTenantPage: No domain found in searchParams or headers");
    notFound();
  }

  const tenant = await getTenantByDomain(domain);

  if (!tenant) {
    notFound();
  }

  const dashboardData = await getTenantDashboardData(tenant.id);

  const claimed = await isTenantClaimed(tenant.id);
  const user = await getCurrentUser();
  const hasAccess = user ? await getUserTenantAccess(tenant.id) : null;

  // If not claimed, show claim page
  if (!claimed) {
    return <ClaimPage tenant={tenant} isClaimed={false} />;
  }

  // If claimed but user not authenticated or doesn't have access, show login
  if (!user || !hasAccess) {
    return <ClaimPage tenant={tenant} isClaimed={true} />;
  }

  // User is authenticated and has access, show dashboard
  return <TenantDashboard tenant={tenant} data={dashboardData} currentDomain={domain} />;
}

