"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, CreditCard, DollarSign, Plus, ExternalLink, Globe, Calendar } from "lucide-react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  domains: Array<{
    id: string;
    domain: string;
    subdomain: string | null;
    is_primary: boolean;
  }>;
}

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const updateTableWidth = () => {
      const headerEl = headerRef.current;
      const contentEl = headerEl?.closest('.page-content');
      if (!headerEl || !contentEl) return;

      const headerRect = headerEl.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();

      const textLeft = headerRect.left;
      const rightEdge = contentRect.right - 48;
      const width = rightEdge - textLeft - 50;

      if (width > 0) {
        setTableWidth(width);
      }
    };

    const frame = window.requestAnimationFrame(updateTableWidth);
    window.addEventListener('resize', updateTableWidth);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateTableWidth);
    };
  }, []);

  useEffect(() => {
    fetchTenants();
  }, []);

  const [billingData, setBillingData] = useState<any>(null);

  useEffect(() => {
    fetchTenants();
    fetchBillingData();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants");
      const data = await response.json();
      setTenants(data || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingData = async () => {
    try {
      const response = await fetch("/api/admin/billing?range=30d");
      const data = await response.json();
      setBillingData(data);
    } catch (error) {
      console.error("Error fetching billing data:", error);
    }
  };

  const totalTenants = tenants.length;
  const activeTenants = billingData?.activeSubscriptions || tenants.length;
  const monthlyRevenue = billingData?.totalMRR ? `$${(billingData.totalMRR / 100).toLocaleString()}` : "$0";
  const avgRevenuePerTenant = totalTenants > 0 && billingData?.totalMRR 
    ? `$${Math.round((billingData.totalMRR / 100) / totalTenants).toLocaleString()}` 
    : "$0";
  const recentTenants = tenants.slice(0, 10);

  const stats = [
    {
      label: "Total Tenants",
      value: totalTenants.toString(),
      icon: <Users className="w-5 h-5" />,
      change: "+12%",
    },
    {
      label: "Active Subscriptions",
      value: activeTenants.toString(),
      icon: <TrendingUp className="w-5 h-5" />,
      change: "+8%",
    },
    {
      label: "Monthly Revenue",
      value: monthlyRevenue,
      icon: <DollarSign className="w-5 h-5" />,
      change: "+18%",
    },
    {
      label: "Avg. Revenue/Tenant",
      value: avgRevenuePerTenant,
      icon: <CreditCard className="w-5 h-5" />,
      change: "+5%",
    },
  ];

  if (loading) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Loading dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
      <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          {/* Header */}
        <div ref={headerRef} className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 className="text-[1.625rem] font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Manage tenants, monitor billing, and track platform analytics
              </p>
            </div>
            <motion.button
              onClick={() => window.location.href = "/admin/tenants/new"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 shadow-sm"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Tenant
            </motion.button>
          </div>
        </div>

          {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <AnimatePresence mode="popLayout">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                    {stat.icon}
                  </div>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {stat.change}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    {stat.label}
                  </p>
                  <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Recent Tenants Table */}
        <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Recent Tenants
            </h2>
            <Link
              href="/admin/tenants"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
                  View all
                </Link>
              </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 border-b border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <AnimatePresence mode="popLayout">
                {recentTenants.length > 0 ? (
                    recentTenants.map((tenant, index) => {
                    const primaryDomain = tenant.domains.find((d) => d.is_primary) ?? tenant.domains[0];
                    return (
                        <motion.tr
                          key={tenant.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {tenant.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  /{tenant.slug}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200">
                            {primaryDomain ? (
                              <div className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                                <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {primaryDomain.domain}
                                </span>
                          </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                              <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              {new Date(tenant.created_at).toLocaleDateString()}
                            </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <motion.a
                              href={`/admin/tenants/${tenant.slug}`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                title="View Details"
                            >
                                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                              </motion.a>
                          </div>
                          </td>
                        </motion.tr>
                    );
                  })
                ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          No tenants yet
                        </p>
                  <Link
                    href="/admin/tenants/new"
                          className="text-sm font-medium text-gray-900 hover:text-gray-700 mt-2 inline-block"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                  >
                          Create your first tenant
                  </Link>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        <div className="pb-8"></div>
      </div>
    </div>
  );
}
