import { getTenantDashboardData } from "@/lib/analytics";
import { listTenantsWithDomains } from "@/lib/tenants";

import { TenantDashboard } from "../tenant/_components/tenant-dashboard";

// Force dynamic rendering for local dev
export const dynamic = "force-dynamic";

export default async function LocalDevDashboard() {
  // Get the first tenant for local dev (or create a mock one)
  const tenants = await listTenantsWithDomains();
  
  if (tenants.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-4">No tenants found</h1>
          <p className="text-slate-600 mb-6">
            Create a tenant via the admin dashboard first, then refresh this page.
          </p>
          <a
            href="/admin"
            className="inline-block rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
          >
            Go to Admin Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Use the first tenant for local dev
  const tenant = tenants[0];
  const dashboardData = await getTenantDashboardData(tenant.id);

  return <TenantDashboard tenant={tenant} data={dashboardData} />;
}

