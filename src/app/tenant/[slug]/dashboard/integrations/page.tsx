"use client";

import { useEffect, useState, Suspense } from "react";
import { Search, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams, useParams } from "next/navigation";
import { IntegrationLogo } from "@/components/integration-logo";

export const dynamic = "force-dynamic";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: "available" | "coming-soon" | "connected";
  createdBy?: string;
  dateConnected?: string;
}

const availableIntegrations: Integration[] = [
  {
    id: "calendly",
    name: "Calendly",
    description: "Online appointment scheduling software",
    logo: "calendly",
    status: "available",
  },
  {
    id: "cal",
    name: "Cal.com",
    description: "Open-source scheduling and calendar platform",
    logo: "cal",
    status: "available",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Marketing, sales, and service platform",
    logo: "hubspot",
    status: "available",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sales CRM and pipeline management",
    logo: "pipedrive",
    status: "available",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "CRM and customer success platform",
    logo: "salesforce",
    status: "available",
  },
];

function IntegrationsContent() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Fetch user's connected integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      if (!slug) return;
      
      try {
        const response = await fetch(`/api/integrations/list?slug=${slug}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Map database integrations to UI format
          const connectedIntegrations: Integration[] = data.integrations.map((dbIntegration: any) => {
            const available = availableIntegrations.find(i => i.id === dbIntegration.integration_type);
            if (available) {
              return {
                ...available,
                status: dbIntegration.is_connected ? "connected" : "available",
                dateConnected: dbIntegration.last_sync_at || dbIntegration.created_at,
              };
            }
            return null;
          }).filter(Boolean) as Integration[];
          
          setIntegrations(connectedIntegrations);
        }
      } catch (error) {
        console.error('Failed to fetch integrations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, [slug]);

  useEffect(() => {
    // Check for connection success/error from OAuth callback
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      const integration = availableIntegrations.find(i => i.id === connected);
      setNotification({
        type: "success",
        message: `Successfully connected to ${integration?.name || connected}!`,
      });
      // Clear the URL and refresh integrations
      window.history.replaceState({}, "", `/dashboard/integrations`);
      // Refetch integrations to show updated status
      if (slug) {
        fetch(`/api/integrations/list?slug=${slug}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const connectedIntegrations: Integration[] = data.integrations.map((dbIntegration: any) => {
                const available = availableIntegrations.find(i => i.id === dbIntegration.integration_type);
                if (available) {
                  return {
                    ...available,
                    status: dbIntegration.is_connected ? "connected" : "available",
                    dateConnected: dbIntegration.last_sync_at || dbIntegration.created_at,
                  } as Integration;
                }
                return null;
              }).filter(Boolean) as Integration[];
              setIntegrations(connectedIntegrations);
            }
          })
          .catch(console.error);
      }
    } else if (error) {
      const integration = availableIntegrations.find(i => i.id === error);
      setNotification({
        type: "error",
        message: `Failed to connect to ${integration?.name || error}. Please try again.`,
      });
      // Clear the URL
      window.history.replaceState({}, "", `/dashboard/integrations`);
    }
  }, [searchParams, slug]);

  // Merge available integrations with connected ones
  const allIntegrations = availableIntegrations.map(available => {
    const connected = integrations.find(i => i.id === available.id);
    return connected || available;
  });

  const filteredIntegrations = allIntegrations.filter(integration => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        integration.name.toLowerCase().includes(query) ||
        integration.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <>
      <div
        className="page-content"
        style={{
          paddingLeft: '0px',
          paddingTop: '0px',
        }}
      >
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          {/* Notification */}
          {notification && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                notification.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className="text-sm font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[1.625rem] font-medium text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Integrations
            </h1>
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              />
            </div>
          </div>

          {/* Connected Apps */}
          {integrations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Connected Apps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations
                  .filter(integration => integration.status === "connected")
                  .map((integration) => (
                    <motion.div
                      key={integration.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedIntegration(integration);
                        setIsDrawerOpen(true);
                        // Store in sessionStorage to pass to drawer
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('selectedIntegration', JSON.stringify(integration));
                          window.dispatchEvent(new Event('openIntegrationDrawer'));
                        }
                      }}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <IntegrationLogo name={integration.logo} size="lg" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-sm font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              {integration.name}
                            </h4>
                            <span className="px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full">
                              Connected
                            </span>
                          </div>
                          <p className="text-xs text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            {integration.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* Popular Integrations */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Popular integrations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations
                .filter(integration => integration.status !== "connected")
                .map((integration) => (
                  <motion.div
                    key={integration.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (integration.status === "available" || integration.status === "connected") {
                        setSelectedIntegration(integration);
                        setIsDrawerOpen(true);
                        // Store in sessionStorage to pass to drawer
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('selectedIntegration', JSON.stringify(integration));
                          window.dispatchEvent(new Event('openIntegrationDrawer'));
                        }
                      }
                    }}
                    className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow ${
                      integration.status === "available" || integration.status === "connected" ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <IntegrationLogo name={integration.logo} size="lg" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            {integration.name}
                          </h4>
                          {integration.status === "coming-soon" && (
                            <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                              Coming soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          {integration.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        </div>
        <div className="pb-8"></div>
      </div>

      {/* Integration Drawer - Managed by layout */}
      {/* The drawer is rendered at the layout level and listens for events */}
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
