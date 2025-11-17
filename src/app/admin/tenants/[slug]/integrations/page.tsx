"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, CheckCircle, XCircle, Settings, ExternalLink, Loader2 } from "lucide-react";

interface Integration {
  id: string;
  integration_type: string;
  is_connected: boolean;
  created_at?: string;
  name?: string;
  category?: string;
  description?: string;
  connected?: boolean;
}

export default function IntegrationsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  // Available integrations catalog
  const availableIntegrations = [
    {
      id: "calendly",
      name: "Calendly",
      category: "Scheduling",
      description: "Automatically book appointments and sync calendars",
    },
    {
      id: "salesforce",
      name: "Salesforce",
      category: "CRM",
      description: "Sync customer data and manage leads",
    },
    {
      id: "zapier",
      name: "Zapier",
      category: "Automation",
      description: "Connect to 5000+ apps with automated workflows",
    },
    {
      id: "slack",
      name: "Slack",
      category: "Communication",
      description: "Send notifications and updates to your team",
    },
    {
      id: "hubspot",
      name: "HubSpot",
      category: "CRM",
      description: "Integrate with HubSpot for customer management",
    },
    {
      id: "twilio",
      name: "Twilio",
      category: "Communication",
      description: "Send SMS and make phone calls",
    },
  ];

  useEffect(() => {
    fetchIntegrations();
  }, [slug]);

  const fetchIntegrations = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clients/${slug}/integrations`);
      if (response.ok) {
        const data = await response.json();
        // Merge with available integrations
        const merged = availableIntegrations.map((avail) => {
          const connected = data.integrations?.find(
            (int: Integration) => int.integration_type === avail.id && int.is_connected
          );
          return {
            ...avail,
            id: avail.id,
            connected: !!connected,
            integration: connected,
          };
        });
        setIntegrations(merged as any);
      }
    } catch (error) {
      console.error("Error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", "Scheduling", "CRM", "Communication", "Automation"];

  const [activeCategory, setActiveCategory] = useState("All");

  const filteredIntegrations = activeCategory === "All"
    ? integrations
    : integrations.filter((int) => int.category === activeCategory);

  const connectedCount = integrations.filter((int) => int.connected).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
            <p className="text-sm text-gray-500 mt-1">
              Connect your AI agent with third-party services
            </p>
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Browse All Integrations
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === category
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Connected</p>
              <p className="text-2xl font-semibold text-gray-900">{connectedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-semibold text-gray-900">
                {integrations.length - connectedCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{integrations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-gray-700">
                    {integration.name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                  <p className="text-xs text-gray-500">{integration.category}</p>
                </div>
              </div>
              {integration.connected ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                  <XCircle className="w-3 h-3" />
                  Not Connected
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-6">{integration.description}</p>

            <div className="flex items-center gap-3">
              {integration.connected ? (
                <>
                  <button className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configure
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Disconnect
                  </button>
                </>
              ) : (
                <button className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Featured Integration */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <span className="text-2xl font-bold text-purple-600">AI</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need a Custom Integration?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Don't see the integration you need? We can build custom integrations for your specific requirements.
            </p>
            <button className="px-4 py-2 text-sm font-medium text-purple-700 bg-white border border-purple-200 rounded-full hover:bg-purple-50 transition-colors flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Request Integration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
