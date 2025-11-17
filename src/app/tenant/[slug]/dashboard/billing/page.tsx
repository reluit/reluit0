"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { ExternalLink, Receipt, CreditCard, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Dropdown } from "@/components/ui/dropdown";

export const dynamic = "force-dynamic";

interface SubscriptionData {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive';
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_price_id: string | null;
  stripe_customer_id?: string | null;
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
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchSubscriptionData();

    // Check for successful payment from Stripe redirect
    const sessionId = searchParams.get('session_id');

    if (sessionId) {
      setWaitingForPayment(true);

      // Verify payment status with Stripe
      const verifyPayment = async () => {
        try {
          console.log(`[Billing] Verifying payment for session: ${sessionId}`);
          const response = await fetch(`/api/stripe/check-status?session_id=${sessionId}&slug=${slug}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });
          const data = await response.json();

          console.log('[Billing] Payment verification response:', data);

          if (response.ok && data.success && data.isPaid) {
            console.log('[Billing] Payment verified successfully!');
            
            // Immediately update state if setup is complete
            // But also check if we have invoices - if no invoices, setup is not complete
            if (data.setupComplete !== false) {
              // Will be updated when fetchSubscriptionData runs and checks invoices
              console.log('[Billing] Setup marked as complete in UI');
            }

            setPaymentSuccess(true);
            setWaitingForPayment(false);

            // Dispatch event to hide banner immediately
            window.dispatchEvent(new Event('setupComplete'));

            // Clear URL params
            window.history.replaceState({}, '', window.location.pathname);

            // Refresh subscription data to get latest from database
            // Add a small delay to ensure database update is visible
            setTimeout(async () => {
            await fetchSubscriptionData();
            }, 500);
          } else {
            setWaitingForPayment(false);
            console.error('[Billing] Payment verification failed:', data.error || data.message);
            // Still refresh data in case webhook updated it
            setTimeout(async () => {
              await fetchSubscriptionData();
            }, 1000);
          }
        } catch (error) {
          setWaitingForPayment(false);
          console.error('[Billing] Error verifying payment:', error);
          // Still refresh data in case webhook updated it
          setTimeout(async () => {
            await fetchSubscriptionData();
          }, 1000);
        }
      };

      verifyPayment();
    }
  }, [slug, searchParams]);

  // Calculate table width - reduced from evaluate page
  useEffect(() => {
    const updateTableWidth = () => {
      const headerEl = headerRef.current;
      const contentEl = headerEl?.closest('.page-content');
      if (!headerEl || !contentEl) return;

      const headerRect = headerEl.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();

      // Calculate width: from header left edge to content right edge, but reduce more
      const textLeft = headerRect.left;
      const rightEdge = contentRect.right - 48; // 48px padding on right
      const width = rightEdge - textLeft - 600; // Reduce by 600px for smaller table

      if (width > 0) {
        setTableWidth(Math.min(width, 700)); // Cap at 700px max (reduced from 800px)
      }
    };

    // Use setTimeout to avoid blocking initial render
    const timeout = setTimeout(() => {
      updateTableWidth();
      window.addEventListener('resize', updateTableWidth);
    }, 0);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateTableWidth);
    };
  }, []);

  const fetchSubscriptionData = async () => {
    if (!slug) return;

    try {
      setLoading(true);

      // Use AbortController for faster cancellation if component unmounts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`/api/stripe/subscription?slug=${slug}`, {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch subscription data');
      }

      const data = await response.json();

        setSubscription(data.subscription);
        const newInvoices = data.invoices || [];
        setInvoices(newInvoices);

      // Update setup completion status: if no invoices, setup is not complete
      // Setup is complete only if there are invoices (invoices indicate payment was made)
      const hasInvoices = newInvoices.length > 0;
      setHasOneTimePayment(hasInvoices);

        // Set default month to most recent invoice if no month is selected
        if (newInvoices.length > 0 && !selectedMonth) {
          const mostRecent = newInvoices[0];
          const dateStr = mostRecent.period_start || mostRecent.created_at;
          if (dateStr) {
            const date = new Date(dateStr);
            const monthStr = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            setSelectedMonth(monthStr);
          }
        }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch subscription data:', error);
      }
    } finally {
      setLoading(false);
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

  const handleSetupSubscription = async () => {
    setProcessing(true);
    try {
      // Get setup fee amount from environment
      const setupFeeAmount = parseInt(process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_AMOUNT || '0');

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          setupFeeAmount,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank', 'noopener,noreferrer');
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

  // Get unique months from invoices (memoized for performance)
  const months = useMemo(() => {
    return Array.from(
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
  }, [invoices]);

  // Filter invoices by selected month (memoized for performance)
  const filteredInvoices = useMemo(() => {
    if (!selectedMonth) return invoices;
    return invoices.filter(inv => {
        const dateStr = inv.period_start || inv.created_at;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const monthStr = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return monthStr === selectedMonth;
    });
  }, [invoices, selectedMonth]);

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

              {waitingForPayment ? (
                <>
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <p className="text-sm font-medium text-blue-600">
                        Waiting for payment...
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      Please complete your payment in the invoice tab. This page will automatically update once payment is received.
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Keep this page open while you complete the payment.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-6">
                    To access your dashboard and all platform features, please set up your subscription with a one-time setup fee. You'll be able to manage your subscription through the Stripe customer portal.
                  </p>
                  <button
                    onClick={() => {
                      handleSetupSubscription();
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
                        Setup Subscription
                      </>
                    )}
                  </button>
                </>
              )}
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
          <div ref={headerRef} className="mb-3">
            <h1 className="text-[1.625rem] font-medium text-gray-900">
              Billing
            </h1>
          </div>

          {/* Invoices Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
                <h2 className="text-sm font-medium text-gray-900">Invoices</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Manage Subscription Button - Always show if we have invoices or subscription */}
                {(subscription || invoices.length > 0 || hasOneTimePayment) && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={processing}
                    className="appearance-none bg-white border border-gray-200 rounded-[5px] px-3 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3 h-3" />
                        Manage Subscription
                      </>
                    )}
                  </button>
                )}
                {invoices.length > 0 && months.length > 0 && (
                  <Dropdown
                    value={selectedMonth}
                    onChange={(value) => setSelectedMonth(value)}
                    options={[
                      { value: "", label: "All months" },
                      ...months.map((month) => ({
                        value: month,
                        label: month,
                      })),
                    ]}
                    size="sm"
                  />
                )}
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
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
