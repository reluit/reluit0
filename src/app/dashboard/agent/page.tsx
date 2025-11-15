"use client";

import { useEffect, useState, useRef } from "react";
import { ExternalLink, ChevronRight, Settings, Edit, Globe, Mic, Search, FileText, Plus, Trash2, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [activeTab, setActiveTab] = useState<"overview" | "knowledge-base">("overview");
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const [activeFilters, setActiveFilters] = useState<Array<{ type: string; value: string }>>([]);
  const addDocumentButtonRef = useRef<HTMLDivElement>(null);
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
    const handleClickOutside = (event: MouseEvent) => {
      if (addDocumentButtonRef.current && !addDocumentButtonRef.current.contains(event.target as Node)) {
        setIsAddDocumentOpen(false);
      }
    };

    if (isAddDocumentOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAddDocumentOpen]);

  const closeAllDropdowns = () => {
    setIsAddDocumentOpen(false);
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

  const systemPrompt = `You are an upbeat, professional cold-calling assistant for an AI agency (its named Reluit, if they ask about it say we're in the early stages and just now acquiring clients so we're willing to do some projects for low costs $500 upfront and $250/m in maintenance which covers credits and upkeep of the ai agent and new features, support, changes, and a managed analytics dashboard) that builds voice AI agents for businesses. Your goal is to briefly introduce the product, quickly capture the recipient's interest in using AI-powered voice solutions for their company, and ask a qualifying question to see if a follow-up call or demo is appropriate. Be clear, respectful if uninterested, concise, and avoid sounding robotic or scripted. Say you've already built one tailored to their business and you'd love to send it over to them if they're interested. Then collect email and other details.`;

  const firstMessage = "Hi, this is Matt from Reluit, we specialize in AI voice agents and have found a great opportunity for you. Is now a good time to talk for a minute?";

  return (
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
              {activeTab === "overview" ? "Agent Configuration" : "Agent Knowledge Base"}
            </h1>
            {activeTab === "overview" && (
              <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 shadow-sm">
                <Edit className="h-3.5 w-3.5" />
                Request Edit
              </button>
            )}
            {activeTab === "knowledge-base" && (
              <div className="relative" ref={addDocumentButtonRef}>
                <button
                  onClick={() => setIsAddDocumentOpen(!isAddDocumentOpen)}
                  className="px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                  Add document
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAddDocumentOpen ? 'rotate-180' : ''}`} />
                </button>
                {isAddDocumentOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                    <button className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      <Globe className="h-4 w-4" />
                      Add URL
                    </button>
                    <button className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      <FileText className="h-4 w-4" />
                      Add Files
                    </button>
                    <button className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      <span className="w-4 h-4 flex items-center justify-center text-sm font-semibold">T</span>
                      Create Text
                    </button>
                  </div>
                )}
              </div>
            )}
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
          </div>
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
                  <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    {systemPrompt}
                  </p>
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
                  <p className="text-sm text-gray-700" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    {firstMessage}
                  </p>
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-sm font-semibold text-white">M</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                        Matt - Real, Hyper-realistic
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                        Primary Voice
                      </span>
                    </div>
                  </div>
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-gray-200 flex-shrink-0 shadow-sm">
                      <span className="text-2xl">🇺🇸</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                        English (US)
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                        Default
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                          <div>
                            <p className="font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              Attention - Memes Make Money
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              https://www.attention.ad/
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium bg-blue-100 text-blue-800">
                          URL
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                        srirammk.6@gmail.com
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                        Nov 14, 2025, 8:52 PM
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="pb-8"></div>
      </div>
    </div>
  );
}
