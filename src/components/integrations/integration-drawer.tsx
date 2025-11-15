"use client";

import { useState, useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { INTEGRATION_CONFIGS, getComposioClient } from "@/lib/composio";
import { IntegrationLogo } from "@/components/integration-logo";

interface Tool {
  id: string;
  name: string;
  description?: string;
  toolkit: {
    slug: string;
    name: string;
    logo?: string;
  };
  logo?: string;
}

interface ToolsByToolkit {
  [key: string]: Tool[];
}

interface IntegrationDrawerProps {
  integration: {
    id: string;
    name: string;
    description: string;
    logo: string;
    status: "available" | "coming-soon";
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationDrawer({ integration, isOpen, onClose }: IntegrationDrawerProps) {
  const [activeTab, setActiveTab] = useState<"connect" | "tools">("connect");
  const [isConnecting, setIsConnecting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [toolsByToolkit, setToolsByToolkit] = useState<ToolsByToolkit>({});
  const [loadingTools, setLoadingTools] = useState(false);
  const prevIntegrationIdRef = useRef<string | null>(null);

  // Load tools when tools tab is opened
  // ALL HOOKS MUST BE CALLED EVERY TIME - NO EARLY RETURNS BEFORE HOOKS
  useEffect(() => {
    // Check integration inside useEffect, not before hooks
    if (!integration || activeTab !== "tools") {
      return;
    }

    setLoadingTools(true);

    // Reset tools when integration changes
    const toolkitSlug = (() => {
      const toolkitMap: Record<string, string> = {
        'calendly': 'calendly',
        'cal': 'cal',
        'hubspot': 'hubspot',
        'pipedrive': 'pipedrive',
        'salesforce': 'salesforce',
      };
      return toolkitMap[integration.id] || integration.id;
    })();

    if (prevIntegrationIdRef.current !== toolkitSlug) {
      setToolsByToolkit({});
      prevIntegrationIdRef.current = toolkitSlug;
    }

    // Function to get tools for the specific integration
    const getToolsForIntegration = async (): Promise<ToolsByToolkit> => {
      try {
        const composio = getComposioClient();

        const tools = await composio.tools.getRawComposioTools({
          toolkits: [toolkitSlug],
          limit: 100
        });

        const typedTools = tools as unknown as Tool[];

        // Group tools by toolkit (though we'll only have one in this case)
        const toolsByToolkit = typedTools.reduce((acc, tool) => {
          const toolkitSlug = tool.toolkit?.slug || integration.id;
          if (!acc[toolkitSlug]) {
            acc[toolkitSlug] = [];
          }
          acc[toolkitSlug].push(tool);
          return acc;
        }, {} as ToolsByToolkit);

        return toolsByToolkit;
      } catch (error) {
        console.error(`Error fetching tools for ${integration.id}:`, error);
        throw error;
      }
    };

    getToolsForIntegration()
      .then((tools) => {
        setToolsByToolkit(tools);
      })
      .catch((error) => {
        console.error('Failed to load tools:', error);
      })
      .finally(() => {
        setLoadingTools(false);
      });
  }, [integration, activeTab]);

  // Early return AFTER all hooks
  if (!integration) return null;

  const config = INTEGRATION_CONFIGS[integration.id];

  const handleConnect = async () => {
    if (!config) {
      alert('Integration configuration not found');
      return;
    }

    // Validate API key for api_key auth type
    if (config.authType === 'api_key' && !apiKey) {
      alert(`Please enter your ${integration.name} API key`);
      return;
    }

    setIsConnecting(true);
    try {
      // TODO: In production, get Supabase session and pass token
      // const supabase = createClient();
      // const { data: { session } } = await supabase.auth.getSession();
      // if (!session) { alert('Please log in first'); return; }
      // headers: { 'Authorization': `Bearer ${session.access_token}` }

      // Call our API route
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrationId: integration.id,
          apiKey: config.authType === 'api_key' ? apiKey : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Connection failed');
      }

      if (result.redirectUrl) {
        // OAuth flow - open in new tab
        window.open(result.redirectUrl, '_blank');
        alert(`Authentication window opened. Please complete the OAuth flow in the new tab.`);
        onClose();
      } else {
        // API key flow - connection complete
        alert(`Successfully connected to ${integration.name}!`);
        onClose();
      }

    } catch (error: any) {
      console.error('Connection error:', error);
      alert(`Failed to connect: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-[60] overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <IntegrationLogo name={integration.logo} size="lg" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{integration.name}</h2>
                    <p className="text-sm text-gray-600">{integration.description}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("connect")}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === "connect"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Connect
                </button>
                <button
                  onClick={() => setActiveTab("tools")}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === "tools"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Available Tools
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "connect" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        Connect your account
                      </h3>
                      <p className="text-sm text-gray-600 font-normal">
                        {config?.authType === "oauth2"
                          ? `Click the button below to authenticate with ${integration.name} via OAuth.`
                          : `Enter your ${integration.name} API key to connect your account.`}
                      </p>
                    </div>

                    {config?.authType === "api_key" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={`Enter your ${integration.name} API key`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          {config?.authType === "oauth2" ? "Connect with OAuth" : "Connect"}
                        </>
                      )}
                    </button>

                    {!config?.authConfigId && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ This integration is not configured. Please set{" "}
                          <code className="px-1 py-0.5 bg-yellow-100 rounded text-xs">
                            NEXT_PUBLIC_{integration.id.toUpperCase()}_AUTH_CONFIG_ID
                          </code>{" "}
                          in your .env file.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "tools" && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        Tools
                      </h3>
                      <p className="text-sm text-gray-600 font-normal">
                        Tools available through your {integration.name} integration.
                      </p>
                    </div>

                    {loadingTools ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                      </div>
                    ) : Object.keys(toolsByToolkit).length > 0 ? (
                      Object.entries(toolsByToolkit).map(([toolkitSlug, tools]) => (
                        <div key={toolkitSlug}>
                          <div className="space-y-1">
                            {tools.map((tool) => {
                              return (
                                <div
                                  key={tool.id || `${tool.name}-${Math.random()}`}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                  <IntegrationLogo name={integration.logo} size="md" />
                                  <span className="text-sm text-gray-900 font-medium">
                                    {tool.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">
                        No tools available. Connect your account to see available tools and actions.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
