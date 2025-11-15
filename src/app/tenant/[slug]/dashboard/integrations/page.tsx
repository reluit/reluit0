"use client";

import { useEffect, useState, Suspense } from "react";
import { Search, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { IntegrationLogo } from "@/components/integration-logo";

export const dynamic = "force-dynamic";

// Get slug from pathname
function getSlug(pathname: string): string {
  const match = pathname.match(/^\/([^/]+)/);
  return match ? match[1] : '';
}

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: "available" | "coming-soon";
  createdBy?: string;
  dateCreated?: string;
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
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const slug = getSlug(pathname);
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [integrations] = useState<Integration[]>([]); // Empty for now - no configured integrations
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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
      // Clear the URL
      window.history.replaceState({}, "", `/dashboard/integrations`);
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

  const filteredIntegrations = availableIntegrations.filter(integration => {
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
          <div className="mb-3">
            <h1 className="text-[1.625rem] font-medium text-gray-900 mb-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
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

          {/* Empty State */}
          {integrations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 mb-12">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <Globe className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-600">?</span>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                No integrations configured
              </h2>
              <p className="text-sm text-gray-600 text-center max-w-md" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Add an integration below for whichever CRM<br />or booking software you use.
              </p>
            </div>
          )}

          {/* Suggested Integrations */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Popular integrations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations.map((integration) => (
                <motion.div
                  key={integration.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (integration.status === "available") {
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
                    integration.status === "available" ? "cursor-pointer" : "cursor-not-allowed opacity-75"
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
