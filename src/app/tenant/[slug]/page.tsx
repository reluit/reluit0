import { notFound } from "next/navigation";

import { getCurrentUser, getUserTenantAccess, isTenantClaimed } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenants";

import { ClaimPage } from "../_components/claim-page";
import { TenantDashboard } from "../_components/tenant-dashboard";

interface TenantPageProps {
  params: {
    slug: string;
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const tenant = await getTenantBySlug(params.slug);

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
  return <TenantDashboard tenant={tenant} />;
}

