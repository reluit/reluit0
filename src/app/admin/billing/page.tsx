"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dropdown } from "@/components/ui/dropdown";
import { DollarSign, TrendingUp, CreditCard, AlertCircle, ExternalLink } from "lucide-react";

interface BillingData {
  totalMRR: number;
  totalARR: number;
  totalRevenue: number;
  activeSubscriptions: number;
  overdueInvoices: Array<{
    id: string;
    tenantName: string;
    slug: string;
    amount: number;
    currency: string;
    dueDate: string;
    status: string;
  }>;
  recentInvoices: Array<{
    id: string;
    tenantName: string;
    slug: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    hostedInvoiceUrl: string | null;
  }>;
  subscriptionMetrics: {
    active: number;
    trialing: number;
    canceled: number;
    pastDue: number;
  };
}

export default function AdminBillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "paid" | "overdue" | "pending">("all");
  const [timeRange, setTimeRange] = useState<"30d" | "90d" | "1y">("30d");
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
    fetchBillingData();
  }, [filter, timeRange]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/billing?filter=${filter}&range=${timeRange}`);
      const data = await response.json();
      setBilling(data);
    } catch (error) {
      console.error("Error fetching billing data:", error);
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
              Loading billing data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Failed to load billing data
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
                Billing Overview
              </h1>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Revenue, subscriptions, and payment analytics
              </p>
            </div>

                <Dropdown
                  value={timeRange}
                  onChange={(value) => setTimeRange(value as any)}
                  options={[
                    { value: "30d", label: "Last 30 days" },
                    { value: "90d", label: "Last 90 days" },
                    { value: "1y", label: "Last year" },
                  ]}
                  size="sm"
                />
              </div>
            </div>

          {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <AnimatePresence mode="popLayout">
            <motion.div
              key="metric-mrr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
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
                  ${(billing.totalMRR / 100).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  ${(billing.totalARR / 100).toLocaleString()} ARR
                </p>
              </div>
            </motion.div>

            <motion.div
              key="metric-subscriptions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Active Subscriptions
                </p>
                <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {billing.subscriptionMetrics.active}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {billing.subscriptionMetrics.trialing} trialing
                </p>
              </div>
            </motion.div>

            <motion.div
              key="metric-revenue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Total Revenue
                </p>
                <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  ${(billing.totalRevenue / 100).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  All time
                </p>
              </div>
            </motion.div>

            <motion.div
              key="metric-overdue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Overdue Invoices
                </p>
                <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {billing.overdueInvoices.length}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Requires attention
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
            </div>

          {/* Overdue Invoices Alert */}
          {billing.overdueInvoices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6"
          >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    {billing.overdueInvoices.length} Overdue Invoice{billing.overdueInvoices.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-2">
                    {billing.overdueInvoices.slice(0, 3).map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between text-sm">
                        <div>
                        <span className="font-medium text-amber-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          {invoice.tenantName}
                        </span>
                        <span className="text-amber-700" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          {' '}(/{invoice.slug})
                        </span>
                        </div>
                        <div className="flex items-center gap-2">
                        <span className="text-amber-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            ${(invoice.amount / 100).toLocaleString()}
                          </span>
                        <span className="text-amber-700" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            Due {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {billing.overdueInvoices.length > 3 && (
                    <p className="text-xs text-amber-700" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                        +{billing.overdueInvoices.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        {/* Recent Invoices Table */}
        <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Recent Invoices
            </h2>
                <Dropdown
                  value={filter}
                  onChange={(value) => setFilter(value as any)}
                  options={[
                    { value: "all", label: "All Invoices" },
                    { value: "paid", label: "Paid" },
                    { value: "overdue", label: "Overdue" },
                    { value: "pending", label: "Pending" },
                  ]}
                  size="sm"
                />
            </div>
            <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'auto' }}>
              <thead>
                  <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 border-b border-gray-200">
                    Actions
                  </th>
                  </tr>
                </thead>
              <tbody className="bg-white">
                <AnimatePresence mode="popLayout">
                  {billing.recentInvoices.length > 0 ? (
                    billing.recentInvoices.map((invoice, index) => (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 border-b border-gray-200">
                          <div>
                            <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              {invoice.tenantName}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              /{invoice.slug}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                          ${(invoice.amount / 100).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : invoice.status === 'open'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-end">
                          {invoice.hostedInvoiceUrl ? (
                              <motion.a
                              href={invoice.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 p-1.5 hover:bg-gray-100 rounded transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </motion.a>
                          ) : (
                              <span className="text-xs text-gray-400">—</span>
                          )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                        No invoices found
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
