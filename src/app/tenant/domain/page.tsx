import { notFound } from "next/navigation";

import { getCurrentUser, getUserTenantAccess, isTenantClaimed } from "@/lib/auth";
import { getTenantByDomain } from "@/lib/tenants";

import { ClaimPage } from "../_components/claim-page";
import { TenantDashboard } from "../_components/tenant-dashboard";

// Force dynamic rendering - this page needs searchParams at runtime
export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface DomainTenantPageProps {
  searchParams: {
    domain?: string;
  };
}

export default async function DomainTenantPage({ searchParams }: DomainTenantPageProps) {
  const domain = typeof searchParams.domain === "string" ? searchParams.domain : undefined;

  if (!domain) {
    notFound();
  }

  const tenant = await getTenantByDomain(domain);

  if (!tenant) {
    notFound();
  }

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
  return <TenantDashboard tenant={tenant} currentDomain={domain} />;
}

