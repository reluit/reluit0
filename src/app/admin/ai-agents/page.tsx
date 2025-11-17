"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Bot, Volume2, Settings, Trash2, Search, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AIAgent {
  id: string;
  tenant_id: string;
  name: string;
  agent_type: string;
  elevenlabs_agent_id: string | null;
  voice_profile_id: string | null;
  system_prompt: string | null;
  first_message: string | null;
  language: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AIAgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Array<{ type: string; value: string }>>([]);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const router = useRouter();
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
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/admin/ai-agents");
      const data = await response.json();

      if (response.ok) {
        setAgents(data.agents || []);
      } else {
        console.error("Failed to fetch agents:", data.error);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this agent?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/ai-agents/${agentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAgents(agents.filter((a) => a.id !== agentId));
      } else {
        alert("Failed to delete agent");
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert("Error deleting agent");
    }
  };

  const handleRemoveFilter = (filter: { type: string; value: string }) => {
    setActiveFilters(activeFilters.filter(f => f.type !== filter.type || f.value !== filter.value));
  };

  const handleAddFilter = (filter: { type: string; value: string }) => {
    if (!activeFilters.find(f => f.type === filter.type && f.value === filter.value)) {
      setActiveFilters([...activeFilters, filter]);
    }
    setOpenFilterDropdown(null);
  };

  const closeAllDropdowns = () => {
    setOpenFilterDropdown(null);
  };

  const filteredAgents = agents.filter(agent => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !agent.name.toLowerCase().includes(query) &&
        !agent.system_prompt?.toLowerCase().includes(query) &&
        !agent.first_message?.toLowerCase().includes(query) &&
        !agent.language?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    for (const filter of activeFilters) {
      if (filter.type === "Status" && agent.status !== filter.value) return false;
      if (filter.type === "Language" && agent.language !== filter.value) return false;
      if (filter.type === "Type" && agent.agent_type !== filter.value) return false;
    }

    return true;
  });

  const statusOptions = Array.from(new Set(agents.map(a => a.status)));
  const languageOptions = Array.from(new Set(agents.map(a => a.language).filter((lang): lang is string => lang !== null && lang !== undefined)));
  const typeOptions = Array.from(new Set(agents.map(a => a.agent_type)));

  if (loading) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Loading agents...
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
            <h1 className="text-[1.625rem] font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              AI Agents
            </h1>
            <motion.button
              onClick={() => router.push("/admin/ai-agents/new")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 shadow-sm"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
          Create Agent
            </motion.button>
          </div>
      </div>

      {agents.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                No agents yet
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Create your first AI agent to start providing voice-based customer support
            </p>
              <motion.button
                onClick={() => router.push("/admin/ai-agents/new")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              >
                <PlusCircle className="h-4 w-4" />
              Create Agent
              </motion.button>
            </div>
          </div>
      ) : (
          <>
            {/* Search Bar */}
            <div className="mb-3">
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                />
              </div>
                  </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-1.5">
              {/* Active Filters */}
              <AnimatePresence mode="popLayout">
                {activeFilters.map((filter) => (
                  <motion.button
                    key={`${filter.type}-${filter.value}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => handleRemoveFilter(filter)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-gray-900 rounded-[5px] hover:bg-gray-800 transition-colors"
                  >
                    <span>{filter.type}: {filter.value}</span>
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </motion.button>
                ))}
              </AnimatePresence>

              {/* Available Filters */}
              {statusOptions.length > 0 && (
                <FilterButton
                  label="Status"
                  options={statusOptions}
                  isOpen={openFilterDropdown === "Status"}
                  onToggle={() => setOpenFilterDropdown(openFilterDropdown === "Status" ? null : "Status")}
                  onClose={closeAllDropdowns}
                  onAddFilter={handleAddFilter}
                />
              )}
              {languageOptions.length > 0 && (
                <FilterButton
                  label="Language"
                  options={languageOptions}
                  isOpen={openFilterDropdown === "Language"}
                  onToggle={() => setOpenFilterDropdown(openFilterDropdown === "Language" ? null : "Language")}
                  onClose={closeAllDropdowns}
                  onAddFilter={handleAddFilter}
                />
              )}
              {typeOptions.length > 0 && (
                <FilterButton
                  label="Type"
                  options={typeOptions}
                  isOpen={openFilterDropdown === "Type"}
                  onToggle={() => setOpenFilterDropdown(openFilterDropdown === "Type" ? null : "Type")}
                  onClose={closeAllDropdowns}
                  onAddFilter={handleAddFilter}
                />
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Agent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        System Prompt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        First Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Language
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <AnimatePresence mode="popLayout">
                      {filteredAgents.map((agent, index) => (
                        <motion.tr
                          key={agent.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          onClick={() => router.push(`/admin/ai-agents/${agent.id}`)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Bot className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {agent.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {agent.agent_type}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200 max-w-md">
                            <p className="line-clamp-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              {agent.system_prompt || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200 max-w-xs">
                            <p className="line-clamp-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              {agent.first_message || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                            {agent.language || "en"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${
                              agent.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : agent.status === "testing"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-800"
                            }`}>
                    {agent.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/admin/ai-agents/${agent.id}`);
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                title="Manage"
                              >
                                <Settings className="h-4 w-4" strokeWidth={1.5} />
                              </motion.button>
                              <motion.button
                                onClick={(e) => handleDelete(agent.id, e)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
                </div>

            {filteredAgents.length === 0 && (
              <div className="mt-8 text-center py-12">
                <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  No agents found matching your filters
                    </p>
                  </div>
                )}
                    </>
                  )}

        <div className="pb-8"></div>
      </div>
                </div>
  );
}

interface FilterButtonProps {
  label: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddFilter: (filter: { type: string; value: string }) => void;
}

function FilterButton({ label, options, isOpen, onToggle, onClose, onAddFilter }: FilterButtonProps) {
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
            className="absolute z-50 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
            {options.map((option) => (
              <button
                key={option}
                onClick={() => handleOptionClick(option)}
                className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              >
                {option}
              </button>
          ))}
          </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
