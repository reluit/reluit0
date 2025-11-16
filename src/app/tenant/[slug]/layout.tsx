import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getTenantBySlug, getTenantByDomain, type TenantWithDomains } from "@/lib/tenants";
import { isTenantClaimed } from "@/lib/auth";
import { ClaimPage } from "../_components/claim-page";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }> | { slug: string };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  // Handle both Promise and direct params (Next.js 16 compatibility)
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams?.slug;

  let tenant: TenantWithDomains | null = null;
  let claimed = false;

  // Try to get tenant by slug first
  if (slug) {
    tenant = await getTenantBySlug(slug);
  }

  // If not found by slug, try to get by domain (for subdomain routing)
  if (!tenant) {
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    tenant = await getTenantByDomain(hostname);
  }

  // If still no tenant found, show 404
  if (!tenant) {
    notFound();
  }

  // Check if tenant is claimed
  claimed = await isTenantClaimed(tenant.id);

  // If not claimed, show claim page instead of children
  if (!claimed) {
    return <ClaimPage tenant={tenant} isClaimed={false} />;
  }

  // If claimed, show the dashboard children
  return <>{children}</>;
}
