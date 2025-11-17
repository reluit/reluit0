"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Globe, Calendar, CreditCard, Settings, Trash2, Edit, ExternalLink, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  setup_complete: boolean;
  domains: Array<{
    id: string;
    domain: string;
    subdomain: string | null;
    is_primary: boolean;
  }>;
  subscription?: {
    id: string;
    status: string;
    current_period_end: string | null;
    stripe_subscription_id: string;
    stripe_price_id: string;
  };
  invoices?: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    hosted_invoice_url: string | null;
  }>;
}

export default function TenantDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "billing" | "settings">("overview");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchTenantDetails();
    }
  }, [slug]);

  const fetchTenantDetails = async () => {
    try {
      const response = await fetch(`/api/admin/tenants?slug=${slug}`);
      const data = await response.json();
      setTenant(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      console.error("Error fetching tenant:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/tenants?slug=${slug}`, {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.href = "/admin/tenants";
      } else {
        alert("Failed to delete tenant");
      }
    } catch (error) {
      console.error("Error deleting tenant:", error);
      alert("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-900 mb-4"></div>
          <p className="text-sm text-gray-500">Loading tenant...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-gray-500">Tenant not found</p>
          <Link href="/admin/tenants" className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Back to Tenants
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition-wrapper">
      <div className="page-content" style={{ paddingLeft: '72px', paddingRight: '48px', paddingTop: '32px' }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tenants
            </Link>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-[2rem] font-medium text-gray-900">{tenant.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-gray-500">/{tenant.slug}</p>
                    {tenant.setup_complete ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertCircle className="w-3 h-3" />
                        Pending Setup
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/${tenant.slug}/dashboard`}
                  target="_blank"
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Dashboard
                </Link>
                <button
                  onClick={handleDeleteTenant}
                  disabled={processing}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants} className="border-b border-gray-200">
            <nav className="flex items-center gap-8">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("billing")}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "billing"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Billing
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "settings"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Settings
              </button>
            </nav>
          </motion.div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Information</h2>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Tenant Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenant.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Slug</dt>
                      <dd className="mt-1 text-sm text-gray-900">/{tenant.slug}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(tenant.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Domains */}
                {tenant.domains.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Domains</h2>
                    <div className="space-y-3">
                      {tenant.domains.map((domain) => (
                        <div key={domain.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">{domain.domain}</span>
                            {domain.is_primary && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Status Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-sm font-medium text-gray-500 mb-3">Status</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Setup</span>
                      {tenant.setup_complete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <AlertCircle className="w-3 h-3" />
                          Incomplete
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscription Card */}
                {tenant.subscription && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-sm font-medium text-gray-500 mb-3">Subscription</h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          tenant.subscription.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          tenant.subscription.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tenant.subscription.status}
                        </span>
                      </div>
                      {tenant.subscription.current_period_end && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Renews</span>
                          <span className="text-sm text-gray-900">
                            {new Date(tenant.subscription.current_period_end).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "billing" && tenant.subscription && (
            <motion.div variants={itemVariants}>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Billing & Invoices</h2>
                <p className="text-sm text-gray-500">Invoice history and subscription details will appear here.</p>
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div variants={itemVariants}>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Settings</h2>
                <p className="text-sm text-gray-500">Configure tenant-specific settings and preferences.</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
