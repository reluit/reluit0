"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CreditCard, Download, Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface Invoice {
  id: string;
  stripe_invoice_id?: string;
  date: string;
  amount: string;
  status: "paid" | "open" | "void" | "uncollectible";
  period: string;
  hosted_invoice_url?: string | null;
}

interface CurrentPlan {
  name: string;
  price: string;
  period: string;
  nextBilling: string | null;
  status: string;
  cancelAtPeriodEnd?: boolean;
}

interface PaymentMethod {
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

interface Usage {
  totalCalls: number;
  totalCredits: string;
  totalCost: string;
}

export default function BillingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    if (slug) {
      fetchBillingData();
    }
  }, [slug]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clients/${slug}/billing`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setCurrentPlan(data.subscription);
        setPaymentMethod(data.paymentMethod);
        setUsage(data.usage);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      {currentPlan && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Plan</h2>
              <p className="text-sm text-gray-600">
                Manage your subscription and billing information
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentPlan.status === "active"
                  ? "bg-emerald-100 text-emerald-700"
                  : currentPlan.status === "trialing"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {currentPlan.status === "active" ? "Active" : currentPlan.status === "trialing" ? "Trialing" : currentPlan.status}
            </span>
          </div>

          <div className="bg-white rounded-lg border border-blue-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{currentPlan.name}</h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900">{currentPlan.price}</span>
                  <span className="text-gray-500">{currentPlan.period}</span>
                </div>
                {currentPlan.cancelAtPeriodEnd && (
                  <p className="text-xs text-amber-600 mt-2">Cancels at period end</p>
                )}
              </div>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                Change Plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-900">Unlimited Calls</span>
              </div>
              <p className="text-xs text-gray-500">No call limits or restrictions</p>
            </div>
            <div className="bg-white rounded-lg border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-900">Premium Integrations</span>
              </div>
              <p className="text-xs text-gray-500">Access to all integrations</p>
            </div>
            <div className="bg-white rounded-lg border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-900">Priority Support</span>
              </div>
              <p className="text-xs text-gray-500">24/7 dedicated support</p>
            </div>
          </div>
        </div>
      )}

      {/* Billing Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
              <p className="text-sm text-gray-500">Manage your payment details</p>
            </div>
          </div>

          <div className="space-y-4">
            {paymentMethod?.card ? (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      •••• •••• •••• {paymentMethod.card.last4}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {paymentMethod.card.exp_month}/{paymentMethod.card.exp_year}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  Default
                </span>
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <p className="text-sm text-gray-500">No payment method on file</p>
              </div>
            )}

            <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Update Payment Method
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Billing Cycle</h3>
              <p className="text-sm text-gray-500">Next billing date and history</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Next Billing Date</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {currentPlan?.nextBilling ? formatDate(currentPlan.nextBilling) : "—"}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Billing Period</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {currentPlan?.period === "/month" ? "Monthly" : currentPlan?.period === "/year" ? "Yearly" : "—"}
              </p>
            </div>

            <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Change Billing Cycle
            </button>
          </div>
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Usage</h3>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Calls</span>
                <span className="text-sm text-gray-500">{usage.totalCalls.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Credits Used</span>
                <span className="text-sm text-gray-500">{usage.totalCredits}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Cost (USD)</span>
                <span className="text-sm text-gray-500">${usage.totalCost}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
            {invoices.length > 0 && (
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download All
              </button>
            )}
          </div>
        </div>

        {invoices.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{invoice.period}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-500">
                          {invoice.stripe_invoice_id ? `Invoice ${invoice.stripe_invoice_id.slice(0, 12)}...` : `Invoice ${invoice.id.slice(0, 8)}...`}
                        </p>
                        <span className="text-xs text-gray-300">•</span>
                        <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{invoice.amount}</p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {invoice.status === "paid" ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span className="text-xs text-emerald-600">Paid</span>
                          </>
                        ) : invoice.status === "open" ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-yellow-600" />
                            <span className="text-xs text-yellow-600">Pending</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            <span className="text-xs text-red-600">{invoice.status}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {invoice.hosted_invoice_url && (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View invoice"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No invoices yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
