import { ROOT_DOMAIN } from "@/lib/env";
import { listTenantsWithDomains } from "@/lib/tenants";

import { CreateTenantForm } from "./_components/create-tenant-form";

// Force dynamic rendering - admin page needs database access
export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function AdminPage() {
  const tenants = await listTenantsWithDomains();

  return (
    <div className="space-y-10 pb-16">
      <CreateTenantForm rootDomain={ROOT_DOMAIN} />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Provisioned clients</h2>
          <p className="text-sm text-slate-400">
            Every tenant gets its own branded dashboard, analytics, and phone agent configuration.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Subdomain</th>
                <th className="px-4 py-3 font-medium">Primary domain</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-100">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    No client dashboards yet. Create one above to get started.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => {
                  const primaryDomain = tenant.domains.find((domain) => domain.is_primary) ?? tenant.domains[0];
                  const subdomain = primaryDomain?.subdomain ?? tenant.slug;

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-900/80">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-100">{tenant.name}</div>
                        <div className="text-xs text-slate-500">{tenant.slug}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300">{subdomain}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {primaryDomain ? (
                          <a
                            href={`https://${primaryDomain.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-300 hover:text-emerald-200"
                          >
                            {primaryDomain.domain}
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-400">{formatDate(tenant.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

