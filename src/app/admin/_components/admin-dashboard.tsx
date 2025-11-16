"use client";

import { useEffect, useState } from "react";
import { ROOT_DOMAIN } from "@/lib/env";
import { CreateTenantForm } from "./create-tenant-form";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domains: Array<{
    id: string;
    domain: string;
    subdomain: string | null;
    is_primary: boolean;
  }>;
  created_at: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants");
      const data = await response.json();
      setTenants(data);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="space-y-10 pb-16">
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Admin Dashboard</h1>
              <p className="text-sm text-slate-400">Manage client dashboards and configurations</p>
            </div>
            <button
              onClick={onLogout}
              className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="px-6">
          <CreateTenantForm rootDomain={ROOT_DOMAIN} onTenantCreated={fetchTenants} />

          <section className="mt-10 space-y-4">
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
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                        Loading...
                      </td>
                    </tr>
                  ) : tenants.length === 0 ? (
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
      </div>
    </div>
  );
}
