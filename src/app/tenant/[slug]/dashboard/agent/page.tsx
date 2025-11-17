"use client";

import { useEffect, useState, useRef } from "react";
import { ExternalLink, ChevronRight, Settings, Edit, Globe, Mic, Search, FileText, Plus, Trash2, X, Wrench, RefreshCw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TypeformModal } from "@/components/ui/typeform-modal";

interface FilterButtonProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddFilter: (filter: { type: string; value: string }) => void;
}

function FilterButton({ label, isOpen, onToggle, onClose, onAddFilter }: FilterButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef?.current && isOpen) {
        const rect = buttonRef.current.getBoundingClientRect();
        const parentElement = buttonRef.current.offsetParent as HTMLElement;

        let top: number;
        let left: number;

        if (parentElement && parentElement !== document.body) {
          const parentRect = parentElement.getBoundingClientRect();
          top = rect.bottom - parentRect.top + parentElement.scrollTop + 4;
          left = rect.left - parentRect.left + parentElement.scrollLeft;
        } else {
          top = rect.bottom + window.pageYOffset + 4;
          left = rect.left + window.pageXOffset;
        }

        setPosition({ top, left });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleOptionClick = (value: string) => {
    onAddFilter({ type: label, value });
    onClose();
  };

  const renderOptions = () => {
    switch (label) {
      case "Type":
        return (
          <>
            <button
              onClick={() => handleOptionClick('URL')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              URL
            </button>
            <button
              onClick={() => handleOptionClick('Text')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              Text
            </button>
            <button
              onClick={() => handleOptionClick('File')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              File
            </button>
          </>
        );
      case "Source":
        return (
          <>
            <button
              onClick={() => handleOptionClick('URL')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              URL
            </button>
            <button
              onClick={() => handleOptionClick('Manual')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              Manual
            </button>
            <button
              onClick={() => handleOptionClick('Upload')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              Upload
            </button>
          </>
        );
      case "Date":
        return (
          <>
            <button
              onClick={() => handleOptionClick('Last 7 days')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              Last 7 days
            </button>
            <button
              onClick={() => handleOptionClick('Last 30 days')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              Last 30 days
            </button>
            <button
              onClick={() => handleOptionClick('Last 90 days')}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
            >
              Last 90 days
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="inline-block">
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-white border border-gray-200 rounded-[5px] hover:bg-gray-50 transition-colors"
      >
        <Plus className="h-3 w-3" strokeWidth={1.5} />
        <span>{label}</span>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bg-white border border-gray-200 rounded-xl shadow-2xl p-1"
            style={{
              width: '180px',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 99999,
            }}
          >
            <div className="space-y-0.5">
              {renderOptions()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function AgentPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "knowledge-base" | "tools">("overview");
  const [isTypeformOpen, setIsTypeformOpen] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const [activeFilters, setActiveFilters] = useState<Array<{ type: string; value: string }>>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Agent data state
  const [agentData, setAgentData] = useState<{
    prompt: string;
    firstMessage: string;
    voiceName: string;
    language: string;
  } | null>(null);
  const [kbDocuments, setKbDocuments] = useState<Array<{
    id: string;
    name: string;
    type: "url" | "file" | "text";
    metadata?: {
      created_at_unix_secs: number;
      last_updated_at_unix_secs: number;
      size_bytes: number;
    };
    url?: string;
    access_info?: {
      creator_name: string;
      creator_email: string;
    };
  }>>([]);
  const [tools, setTools] = useState<Array<{
    id: string;
    name: string;
    description?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [kbLoading, setKbLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [updatingTools, setUpdatingTools] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    fetchAgentData();
  }, []);

  useEffect(() => {
    if (activeTab === "knowledge-base") {
      fetchKbDocuments();
    } else if (activeTab === "tools") {
      fetchTools();
    }
  }, [activeTab]);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tenant/agent");
      const data = await response.json();

      if (response.ok && data.agent) {
        setAgentData({
          prompt: data.agent.prompt || "",
          firstMessage: data.agent.firstMessage || "",
          voiceName: data.agent.voiceName || "Unknown Voice",
          language: data.agent.language || "en",
        });
      }
    } catch (error) {
      console.error("Error fetching agent data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKbDocuments = async () => {
    try {
      setKbLoading(true);
      const response = await fetch("/api/tenant/agent/knowledge-base?page_size=100");
      const data = await response.json();

      if (response.ok && data.documents) {
        setKbDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching KB documents:", error);
    } finally {
      setKbLoading(false);
    }
  };

  const fetchTools = async () => {
    try {
      setToolsLoading(true);
      const response = await fetch("/api/tenant/agent/tools");
      const data = await response.json();

      if (response.ok && data.tools) {
        // Use the tool details from the API
        setTools(data.tools.map((tool: any) => ({
          id: tool.id,
          name: tool.name || `Tool ${tool.id.slice(0, 8)}...`,
          description: tool.description || "Composio integration tool",
        })));
      } else if (response.ok && data.toolIds) {
        // Fallback to tool IDs if tools array not available
        setTools(data.toolIds.map((id: string) => ({
          id,
          name: `Tool ${id.slice(0, 8)}...`,
          description: "Composio integration tool",
        })));
      }
    } catch (error) {
      console.error("Error fetching tools:", error);
    } finally {
      setToolsLoading(false);
    }
  };

  const handleUpdateTools = async () => {
    try {
      setUpdatingTools(true);
      const response = await fetch("/api/tenant/agent/tools", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        // Refresh tools list
        await fetchTools();
        
        // Show detailed message
        let message = data.message || "";
        if (data.errors && data.errors.length > 0) {
          message += `\n\nErrors: ${data.errors.join('\n')}`;
        }
        if (data.toolIds && data.toolIds.length > 0) {
          message += `\n\nSynced ${data.toolIds.length} tool(s)`;
        }
        
        alert(message);
      } else {
        alert(data.error || "Failed to update tools");
      }
    } catch (error) {
      console.error("Error updating tools:", error);
      alert("Failed to update tools");
    } finally {
      setUpdatingTools(false);
    }
  };

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

  const closeAllDropdowns = () => {
    setOpenFilterDropdown(null);
  };

  const handleAddFilter = (filter: { type: string; value: string }) => {
    // Only add if it doesn't already exist
    const exists = activeFilters.some(
      (f) => f.type === filter.type && f.value === filter.value
    );
    if (!exists) {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  const handleRemoveFilter = (filterToRemove: { type: string; value: string }) => {
    setActiveFilters(
      activeFilters.filter(
        (f) => !(f.type === filterToRemove.type && f.value === filterToRemove.value)
      )
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getLanguageDisplay = (lang: string) => {
    const langMap: Record<string, { name: string; flag: string }> = {
      en: { name: "English (US)", flag: "🇺🇸" },
      es: { name: "Spanish", flag: "🇪🇸" },
      fr: { name: "French", flag: "🇫🇷" },
      de: { name: "German", flag: "🇩🇪" },
      it: { name: "Italian", flag: "🇮🇹" },
      pt: { name: "Portuguese", flag: "🇵🇹" },
      ja: { name: "Japanese", flag: "🇯🇵" },
      ko: { name: "Korean", flag: "🇰🇷" },
      zh: { name: "Chinese", flag: "🇨🇳" },
    };
    return langMap[lang] || { name: lang.toUpperCase(), flag: "🌐" };
  };

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
        {/* Header */}
        <div ref={headerRef} className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <h1 className="text-2xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              {activeTab === "overview" ? "Agent Configuration" : activeTab === "knowledge-base" ? "Agent Knowledge Base" : "Agent Tools"}
            </h1>
            <div className="flex items-center gap-4">
              {activeTab === "overview" && (
                <button
                  onClick={() => setIsTypeformOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 shadow-sm"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Request Edit
                </button>
              )}
              {activeTab === "tools" && (
                  <button
                  onClick={handleUpdateTools}
                  disabled={updatingTools}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingTools ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Update Tools
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("knowledge-base")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "knowledge-base"
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              Knowledge Base
            </button>
            <button
              onClick={() => setActiveTab("tools")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "tools"
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              Tools
            </button>
          </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Left Column */}
            <div className="space-y-6">
              {/* System prompt */}
              <div>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    System Prompt
                  </h2>
                  <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Defines the agent's personality and behavior
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  {loading ? (
                    <p className="text-sm text-gray-400" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      Loading...
                    </p>
                  ) : (
                  <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      {agentData?.prompt || "No prompt configured"}
                  </p>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 opacity-60"
                    />
                    <span className="text-sm text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      Default personality
                    </span>
                  </label>
                </div>
              </div>

              {/* First message */}
              <div>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    First Message
                  </h2>
                  <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    The first message the agent will say
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  {loading ? (
                    <p className="text-sm text-gray-400" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      Loading...
                    </p>
                  ) : (
                  <p className="text-sm text-gray-700" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      {agentData?.firstMessage || "No first message configured"}
                  </p>
                  )}
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 opacity-60"
                    />
                    <span className="text-sm text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      Interruptible
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Voices */}
              <div>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    <Mic className="h-4 w-4" />
                    Voices
                  </h2>
                  <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Selected voice for this agent
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  {loading ? (
                    <p className="text-sm text-gray-400" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      Loading...
                    </p>
                  ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-sm font-semibold text-white">
                          {agentData?.voiceName?.[0]?.toUpperCase() || "V"}
                        </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          {agentData?.voiceName || "Unknown Voice"}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                        Primary Voice
                      </span>
                    </div>
                  </div>
                  )}
                </div>
              </div>

              {/* Language */}
              <div>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    <Globe className="h-4 w-4" />
                    Language
                  </h2>
                  <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Default language
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  {loading ? (
                    <p className="text-sm text-gray-400" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      Loading...
                    </p>
                  ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-gray-200 flex-shrink-0 shadow-sm">
                        <span className="text-2xl">
                          {getLanguageDisplay(agentData?.language || "en").flag}
                        </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          {getLanguageDisplay(agentData?.language || "en").name}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                        Default
                      </span>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tools" && (
          <div className="mt-4">
            {toolsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <p className="ml-2 text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Loading tools...
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                          ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {tools.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Wrench className="h-8 w-8 text-gray-300" strokeWidth={1.5} />
                              <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                No tools found. Connect integrations and click "Update Tools" to sync.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        tools.map((tool) => (
                          <tr key={tool.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                                <p className="font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {tool.name}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200">
                              {tool.description || "Composio integration tool"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 border-b border-gray-200 whitespace-nowrap font-mono text-xs">
                              {tool.id}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "knowledge-base" && (
          <div className="mt-4">
            {/* Search Bar */}
            <div className="mb-3">
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search Knowledge Base..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-1.5">
              {/* Active Filters */}
              {activeFilters.map((filter, index) => (
                <motion.button
                  key={`${filter.type}-${filter.value}-${index}`}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-gray-900 rounded-[5px] hover:bg-gray-800 transition-colors"
                  onClick={() => handleRemoveFilter(filter)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{filter.type}: {filter.value}</span>
                  <X className="h-3 w-3" strokeWidth={1.5} />
                </motion.button>
              ))}

              {/* Available Filters */}
              <FilterButton
                label="Type"
                isOpen={openFilterDropdown === "Type"}
                onToggle={() => setOpenFilterDropdown(openFilterDropdown === "Type" ? null : "Type")}
                onClose={closeAllDropdowns}
                onAddFilter={handleAddFilter}
              />
              <FilterButton
                label="Source"
                isOpen={openFilterDropdown === "Source"}
                onToggle={() => setOpenFilterDropdown(openFilterDropdown === "Source" ? null : "Source")}
                onClose={closeAllDropdowns}
                onAddFilter={handleAddFilter}
              />
              <FilterButton
                label="Date"
                isOpen={openFilterDropdown === "Date"}
                onToggle={() => setOpenFilterDropdown(openFilterDropdown === "Date" ? null : "Date")}
                onClose={closeAllDropdowns}
                onAddFilter={handleAddFilter}
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Created by
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Last updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {kbLoading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            Loading documents...
                          </p>
                        </td>
                      </tr>
                    ) : kbDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            No documents found
                          </p>
                        </td>
                      </tr>
                    ) : (
                      kbDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                              {doc.type === "url" && <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />}
                              {doc.type === "file" && <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />}
                              {doc.type === "text" && <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />}
                          <div>
                            <p className="font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {doc.name}
                            </p>
                                {doc.url && (
                            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                    {doc.url}
                            </p>
                                )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                              {doc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                            {doc.access_info?.creator_email || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                            {doc.metadata?.last_updated_at_unix_secs
                              ? new Date(doc.metadata.last_updated_at_unix_secs * 1000).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : "—"}
                      </td>
                    </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="pb-8"></div>
      </div>
    </div>

    {/* Typeform Modal - Outside wrapper to cover full page */}
    <TypeformModal isOpen={isTypeformOpen} onClose={() => setIsTypeformOpen(false)} />
    </>
  );
}
