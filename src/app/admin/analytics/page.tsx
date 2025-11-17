"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Users, DollarSign, Activity, Clock } from "lucide-react";

interface AnalyticsData {
  totalTenants: number;
  activeTenants: number;
  newTenantsThisMonth: number;
  mrr: number;
  totalRevenue: number;
  monthlyGrowth: number;
  subscriptionMetrics: {
    active: number;
    trialing: number;
    canceled: number;
  };
  topTenants: Array<{
    id: string;
    name: string;
    slug: string;
    mrr: number;
    status: string;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
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
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Loading analytics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Failed to load analytics
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
                Analytics
              </h1>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Platform performance and growth metrics
              </p>
            </div>

            <div className="flex items-center gap-2">
              {["7d", "30d", "90d", "1y"].map((range) => (
                <motion.button
                  key={range}
                  onClick={() => setTimeRange(range as any)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    timeRange === range
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                  {range}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

          {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <AnimatePresence mode="popLayout">
            <motion.div
              key="metric-tenants"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{analytics.monthlyGrowth}%
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Total Tenants
                </p>
                <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {analytics.totalTenants}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {analytics.newTenantsThisMonth} new this month
                </p>
              </div>
            </motion.div>

            <motion.div
              key="metric-active-tenants"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Active Tenants
                </p>
                <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {analytics.activeTenants}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {((analytics.activeTenants / analytics.totalTenants) * 100).toFixed(0)}% of total
                </p>
              </div>
            </motion.div>

            <motion.div
              key="metric-mrr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +18%
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Monthly Recurring Revenue
                </p>
                <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  ${(analytics.mrr / 100).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  ${(analytics.totalRevenue / 100).toLocaleString()} total
                </p>
              </div>
            </motion.div>

            <motion.div
              key="metric-avg-revenue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Avg. Revenue/Tenant
                </p>
                <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  ${analytics.activeTenants > 0 ? ((analytics.mrr / 100) / analytics.activeTenants).toFixed(0) : 0}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Per month
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
            </div>

            {/* Revenue Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
          <h2 className="text-base font-semibold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            Revenue Trend
          </h2>
          <div className="h-48 flex items-end gap-2">
                {analytics.revenueByMonth.map((item, index) => {
                  const maxRevenue = Math.max(...analytics.revenueByMonth.map((r) => r.revenue));
              const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-gradient-to-t from-gray-900 to-gray-700 rounded-t"
                    style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                        title={`$${(item.revenue / 100).toLocaleString()}`}
                      ></div>
                  <span className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    {item.month}
                  </span>
                    </div>
                  );
                })}
                  </div>
                </div>

        {/* Top Tenants Table */}
        <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Top Tenants by Revenue
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    MRR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <AnimatePresence mode="popLayout">
              {analytics.topTenants.length > 0 ? (
                analytics.topTenants.map((tenant, index) => (
                      <motion.tr
                        key={tenant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 border-b border-gray-200">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                          {index + 1}
                        </div>
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200">
                        <div>
                            <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              {tenant.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              /{tenant.slug}
                            </p>
                        </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                          ${(tenant.mrr / 100).toLocaleString()}/mo
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${
                          tenant.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          tenant.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tenant.status}
                        </span>
                        </td>
                      </motion.tr>
                ))
              ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center">
                        <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          No tenant data available
                        </p>
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
