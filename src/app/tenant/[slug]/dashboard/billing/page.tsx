"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Receipt, CreditCard, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export const dynamic = "force-dynamic";

interface SubscriptionData {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive';
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_price_id: string | null;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  hosted_invoice_url: string | null;
  subscription_id: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function BillingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || '';
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [hasOneTimePayment, setHasOneTimePayment] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchSubscriptionData();

    // Check for successful checkout (subscription or one-time payment)
    const sessionId = searchParams.get('session_id');
    const paymentSuccess = searchParams.get('payment');
    const slugFromQuery = searchParams.get('slug');

    console.log('\n🟡 [Billing] useEffect - START');
    console.log(`[Billing] URL params: session_id=${sessionId}, payment=${paymentSuccess}, slug=${slugFromQuery}`);

    if (sessionId || paymentSuccess === 'success') {
      console.log(`[Billing] ✅ Session detected! Starting payment verification...`);
      setPaymentSuccess(true);

      // Polling logic to check payment status
      let attempts = 0;
      const maxAttempts = 15; // Increased attempts
      let pollInterval: NodeJS.Timeout | null = null;

      const pollPaymentStatus = async () => {
        attempts++;
        console.log(`\n🔄 [Billing] Polling attempt ${attempts}/${maxAttempts}`);
        console.log(`[Billing] Fetching with session_id: ${sessionId}`);

        try {
          // Fetch with session_id if available (more reliable)
          const url = sessionId
            ? `/api/stripe/subscription?slug=${slug}&session_id=${sessionId}`
            : `/api/stripe/subscription?slug=${slug}`;

          console.log(`[Billing] API URL: ${url}`);

          const response = await fetch(url, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });

          console.log(`[Billing] Response status: ${response.status}`);

          const data = await response.json();

          console.log(`[Billing] API Response:`, {
            hasOneTimePayment: data.hasOneTimePayment,
            subscriptionStatus: data.subscription?.status || null,
            invoicesCount: data.invoices?.length || 0,
          });

          if (response.ok) {
            // Update state immediately
            if (data.hasOneTimePayment !== undefined) {
              console.log(`[Billing] 💰 Payment status: ${data.hasOneTimePayment ? '✅ PAID' : '❌ NOT PAID'}`);
              setHasOneTimePayment(data.hasOneTimePayment);
            } else {
              console.log(`[Billing] ⚠️  hasOneTimePayment not in response!`);
            }
            setSubscription(data.subscription);
            setInvoices(data.invoices || []);

            // If payment is confirmed, stop polling
            if (data.hasOneTimePayment === true) {
              console.log(`[Billing] 🎉 Payment confirmed! Stopping polling.`);
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }

              // Clear URL params
              const cleanUrl = slugFromQuery
                ? `/dashboard/billing?slug=${slugFromQuery}`
                : '/dashboard/billing';
              console.log(`[Billing] Clearing URL params, new URL: ${cleanUrl}`);
              window.history.replaceState({}, '', cleanUrl);
              return; // Exit early
            }
          } else {
            console.error(`[Billing] ❌ API Error:`, data.error);
          }
        } catch (error) {
          console.error(`[Billing] ❌ Fetch error:`, error);
        }

        // Stop after max attempts
        if (attempts >= maxAttempts) {
          console.log(`[Billing] ⏱️  Reached max attempts. Stopping polling.`);
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }

          // Final refresh
          console.log(`[Billing] 🔄 Performing final refresh...`);
          setTimeout(() => {
            fetchSubscriptionData();
          }, 1000);

          // Clear URL params after refresh
          const cleanUrl = slugFromQuery
            ? `/dashboard/billing?slug=${slugFromQuery}`
            : '/dashboard/billing';
          window.history.replaceState({}, '', cleanUrl);
        }
      };

      // Start polling immediately, then every 2 seconds
      console.log(`[Billing] 🚀 Starting initial poll...`);
      pollPaymentStatus();
      console.log(`[Billing] ⏰ Starting poll interval (2s)...`);
      pollInterval = setInterval(pollPaymentStatus, 2000);

      // Cleanup function
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }

    console.log(`[Billing] useEffect - END\n`);
  }, [slug, searchParams]);

  const fetchSubscriptionData = async () => {
    if (!slug) return;

    console.log('\n🔄 [Billing] ===== fetchSubscriptionData START =====');
    console.log(`[Billing] Slug: ${slug}`);
    console.log(`[Billing] Loading: ${loading}`);

    try {
      setLoading(true);
      console.log(`[Billing] Fetching from: /api/stripe/subscription?slug=${slug}`);

      const response = await fetch(`/api/stripe/subscription?slug=${slug}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      console.log(`[Billing] Response status: ${response.status}`);
      console.log(`[Billing] Response ok: ${response.ok}`);

      const data = await response.json();

      console.log(`[Billing] Response data:`, {
        subscriptionId: data.subscription?.id || null,
        subscriptionStatus: data.subscription?.status || null,
        invoicesCount: data.invoices?.length || 0,
        hasOneTimePayment: data.hasOneTimePayment,
      });

      if (response.ok) {
        console.log(`[Billing] Updating state with subscription and invoices...`);
        setSubscription(data.subscription);
        const newInvoices = data.invoices || [];
        setInvoices(newInvoices);

        // Update one-time payment status from Stripe API
        if (data.hasOneTimePayment !== undefined) {
          console.log(`[Billing] ✅ Payment status from Stripe: ${data.hasOneTimePayment ? '✅ PAID' : '❌ NOT PAID'}`);
          setHasOneTimePayment(data.hasOneTimePayment);
        } else {
          console.log(`[Billing] ⚠️  hasOneTimePayment not in response data`);
        }

        // Set default month to most recent invoice if no month is selected or if invoices changed
        if (newInvoices.length > 0 && !selectedMonth) {
          const mostRecent = newInvoices[0];
          const dateStr = mostRecent.period_start || mostRecent.created_at;
          if (dateStr) {
            const date = new Date(dateStr);
            const monthStr = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            console.log(`[Billing] Setting default month to: ${monthStr}`);
            setSelectedMonth(monthStr);
          }
        }
      } else {
        console.error(`[Billing] ❌ API Error:`, data.error);
      }
    } catch (error) {
      console.error(`[Billing] ❌ Fetch error:`, error);
    } finally {
      setLoading(false);
      console.log(`[Billing] ===== fetchSubscriptionData END =====\n`);
    }
  };

  const handleManageSubscription = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open subscription portal');
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
      alert('Failed to open subscription portal');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          priceId,
          slug,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
      alert('Failed to create checkout session');
    } finally {
      setProcessing(false);
    }
  };

  const handleOneTimePayment = async (priceId: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/stripe/checkout-one-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          priceId,
          slug,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Failed to create one-time checkout:', error);
      alert('Failed to create checkout session');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      paid: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        icon: <CheckCircle2 className="w-3 h-3" />,
      },
      open: {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
      },
      void: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: <XCircle className="w-3 h-3" />,
      },
      uncollectible: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <XCircle className="w-3 h-3" />,
      },
      active: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        icon: <CheckCircle2 className="w-3 h-3" />,
      },
      canceled: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: <XCircle className="w-3 h-3" />,
      },
      past_due: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <XCircle className="w-3 h-3" />,
      },
      trialing: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: <Loader2 className="w-3 h-3" />,
      },
    };

    const config = statusConfig[status] || statusConfig.open;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  // Get unique months from invoices (including one-time payments using created_at)
  const months = Array.from(
    new Set(
      invoices
        .map(inv => {
          // Use period_start for subscription invoices, created_at for one-time payments
          const dateStr = inv.period_start || inv.created_at;
          if (!dateStr) return null;
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        })
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const filteredInvoices = selectedMonth
    ? invoices.filter(inv => {
        const dateStr = inv.period_start || inv.created_at;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const monthStr = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return monthStr === selectedMonth;
      })
    : invoices;

  // Debug logging for render state
  console.log(`\n🎨 [Billing] Rendering decision:`);
  console.log(`[Billing]   loading: ${loading}`);
  console.log(`[Billing]   hasOneTimePayment: ${hasOneTimePayment ? '✅ TRUE' : '❌ FALSE'}`);
  console.log(`[Billing]   invoices count: ${invoices.length}`);
  console.log(`[Billing]   Showing: ${hasOneTimePayment ? 'INVOICES TABLE' : 'PAYMENT GATE'}\n`);

  if (loading) {
    return (
      <div className="page-transition-wrapper">
        <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
          <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show one-time payment prompt if not completed (payment gate)
  if (!hasOneTimePayment) {
    return (
      <div className="page-transition-wrapper" style={{ height: '100vh', overflow: 'hidden' }}>
        <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px', height: '100vh', overflow: 'hidden' }}>
          <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-8 h-8 text-gray-600" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-3">
                Complete Setup Payment
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                Please complete your one-time setup payment to access your billing information and invoices.
              </p>
              <button
                onClick={() => {
                  const oneTimePriceId = (process.env.NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID || '').trim();
                  if (!oneTimePriceId) {
                    alert('One-time payment price ID not configured. Please set NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID in your .env file.');
                    return;
                  }
                  handleOneTimePayment(oneTimePriceId);
                }}
                disabled={processing}
                className="w-full px-6 py-3 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Complete Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // After one-time payment is complete, show invoices table
  return (
    <div className="page-transition-wrapper">
      <div
        className="page-content"
        style={{
          paddingLeft: '0px',
          paddingTop: '0px',
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto',
        }}
      >
        {/* Payment Success Notification */}
        <AnimatePresence>
          {paymentSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-lg max-w-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900">Payment Successful!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Your payment has been processed successfully.</p>
                </div>
                <button
                  onClick={() => setPaymentSuccess(false)}
                  className="text-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          {/* Header */}
          <div className="mb-3">
            <h1 className="text-[1.625rem] font-medium text-gray-900">
              Billing
            </h1>
          </div>

          {/* Invoices Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
              <h2 className="text-sm font-medium text-gray-900">Invoices</h2>
              {months.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-[5px] px-3 py-1 pr-8 text-xs font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer transition-all"
                    style={{
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath fill=\'%236b7280\' d=\'M5 7L1 3h8z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 6px center',
                      paddingRight: '24px'
                    }}
                  >
                    <option value="">All months</option>
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg overflow-hidden" style={{ width: 'max-content', maxWidth: '800px' }}>
                {filteredInvoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ tableLayout: 'auto' }}>
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 border-b border-gray-200">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 border-b border-gray-200">
                            Invoice
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {filteredInvoices.map((invoice) => {
                          const isOneTime = !invoice.subscription_id && !invoice.period_start;
                          return (
                            <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                                {formatDate(invoice.period_start || invoice.created_at)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 border-b border-gray-200 whitespace-nowrap">
                                {isOneTime ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium bg-blue-100 text-blue-800">
                                    One-time
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium bg-purple-100 text-purple-800">
                                    Subscription
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 border-b border-gray-200 whitespace-nowrap">
                                {isOneTime 
                                  ? 'One-time Payment'
                                  : invoice.period_start && invoice.period_end
                                  ? `${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`
                                  : 'Subscription'}
                              </td>
                              <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                {getStatusBadge(invoice.status)}
                              </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right border-b border-gray-200 whitespace-nowrap">
                              {formatCurrency(invoice.amount, invoice.currency)}
                            </td>
                            <td className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                              {invoice.hosted_invoice_url ? (
                                <Link
                                  href={invoice.hosted_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 hover:text-gray-700 transition-colors"
                                >
                                  View
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  No invoices found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
