"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FilterDropdown } from "@/components/filter-dropdown";

function FilterButton({ filter, isOpen, onToggle, onApply, availableAgents, onClose }: {
  filter: string;
  isOpen: boolean;
  onToggle: () => void;
  onApply: (filter: Filter) => void;
  availableAgents?: string[];
  onClose: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  
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
        <span>{filter}</span>
      </motion.button>
      {isOpen && (
        <FilterDropdown
          filterType={filter}
          onApply={onApply}
          availableAgents={availableAgents}
          isOpen={true}
          onClose={onClose}
          buttonRef={buttonRef}
        />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

interface Conversation {
  id: string;
  date: string;
  agent: string;
  duration: string;
  messages: number;
  status: "Successful" | "Failed" | "Pending";
}

const mockConversations: Conversation[] = [
  { id: "1", date: "Nov 11, 2025, 1:54 PM", agent: "AI Cold Caller", duration: "1:35", messages: 7, status: "Successful" },
  { id: "2", date: "Nov 11, 2025, 1:53 PM", agent: "Support agent", duration: "0:26", messages: 5, status: "Successful" },
  { id: "3", date: "Nov 11, 2025, 9:21 AM", agent: "Support agent", duration: "0:09", messages: 1, status: "Successful" },
  { id: "4", date: "Nov 11, 2025, 9:20 AM", agent: "Support agent", duration: "0:09", messages: 1, status: "Successful" },
  { id: "5", date: "Nov 10, 2025, 3:44 PM", agent: "AI Cold Caller", duration: "3:30", messages: 15, status: "Successful" },
  { id: "6", date: "Nov 10, 2025, 3:43 PM", agent: "AI Cold Caller", duration: "0:30", messages: 3, status: "Successful" },
  { id: "7", date: "Nov 10, 2025, 3:43 PM", agent: "AI Cold Caller", duration: "0:32", messages: 3, status: "Successful" },
  { id: "8", date: "Nov 10, 2025, 3:42 PM", agent: "AI Cold Caller", duration: "0:08", messages: 1, status: "Successful" },
  { id: "9", date: "Nov 10, 2025, 3:33 PM", agent: "Support agent", duration: "0:42", messages: 4, status: "Successful" },
  { id: "10", date: "Nov 10, 2025, 3:32 PM", agent: "Support agent", duration: "0:33", messages: 5, status: "Successful" },
];

const filterOptions = [
  "Date Before",
  "Date After",
  "Call status",
  "Duration",
  "Agent",
  "Criteria",
  "Data",
  "Tools",
  "User",
];

interface Filter {
  type: string;
  value: string;
  label: string;
}

export default function EvaluatePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);

  const availableAgents = Array.from(new Set(mockConversations.map(c => c.agent)));

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

      // Calculate width same as analytics section: from header left edge to content right edge
      const textLeft = headerRect.left;
      const rightEdge = contentRect.right - 48; // 48px padding on right
      const width = rightEdge - textLeft - 50; // Extend width (only reduce by 50px)

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

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Store in sessionStorage to pass to drawer
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedConversation', JSON.stringify(conversation));
      window.dispatchEvent(new Event('openConversationDrawer'));
    }
  };

  const removeFilter = (filter: Filter) => {
    setActiveFilters(activeFilters.filter(f => f.label !== filter.label));
  };

  const handleApplyFilter = (filter: Filter) => {
    if (!activeFilters.find(f => f.label === filter.label)) {
      setActiveFilters([...activeFilters, filter]);
    }
    setOpenFilterDropdown(null);
  };

  const filteredConversations = mockConversations.filter(conv => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        conv.date.toLowerCase().includes(query) ||
        conv.agent.toLowerCase().includes(query) ||
        conv.duration.toLowerCase().includes(query) ||
        conv.status.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Apply active filters
    for (const filter of activeFilters) {
      if (filter.type === "Call status") {
        if (conv.status !== filter.value) return false;
      } else if (filter.type === "Agent") {
        if (conv.agent !== filter.value) return false;
      } else if (filter.type === "Date After") {
        // Simple date comparison (in real app, use proper date parsing)
        const filterDate = new Date(filter.value);
        const convDate = new Date(conv.date);
        if (convDate < filterDate) return false;
      } else if (filter.type === "Date Before") {
        const filterDate = new Date(filter.value);
        const convDate = new Date(conv.date);
        if (convDate > filterDate) return false;
      } else if (filter.type === "Duration") {
        // Parse duration and compare (e.g., "1:35" -> 95 seconds)
        const [minutes, seconds] = conv.duration.split(':').map(Number);
        const totalSeconds = minutes * 60 + seconds;
        const filterSeconds = parseInt(filter.value) * 60;
        if (totalSeconds < filterSeconds) return false;
      }
    }

    return true;
  });

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
        <div ref={headerRef}>
          <h1 className="text-[1.625rem] font-medium text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            Conversation history
          </h1>
        </div>

        {/* Search Bar */}
        <div className="mb-3">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search conversations..."
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
                key={filter.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => removeFilter(filter)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-gray-900 rounded-[5px] hover:bg-gray-800 transition-colors"
              >
                <span>{filter.label}</span>
                <X className="h-3 w-3" strokeWidth={1.5} />
              </motion.button>
            ))}
          </AnimatePresence>
          
            {/* Available Filters */}
            {filterOptions
              .filter(f => !activeFilters.find(af => af.type === f))
              .map((filter) => (
                <FilterButton
                  key={filter}
                  filter={filter}
                  isOpen={openFilterDropdown === filter}
                  onToggle={() => setOpenFilterDropdown(openFilterDropdown === filter ? null : filter)}
                  onApply={handleApplyFilter}
                  availableAgents={filter === "Agent" ? availableAgents : undefined}
                  onClose={() => setOpenFilterDropdown(null)}
                />
              ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Messages
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Call status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredConversations.map((conversation, index) => (
                  <tr
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                      {conversation.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                      {conversation.agent}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                      {conversation.duration}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                      {conversation.messages}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium bg-green-100 text-green-800">
                        {conversation.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
