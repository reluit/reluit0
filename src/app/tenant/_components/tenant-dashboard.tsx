import type { TenantWithDomains } from "@/lib/tenants";

export function TenantDashboard({ tenant, currentDomain }: { tenant: TenantWithDomains; currentDomain?: string }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-900">dashboard</p>
      </div>
    </div>
  );
}

