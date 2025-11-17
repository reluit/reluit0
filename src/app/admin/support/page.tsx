"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Clock, CheckCircle, AlertCircle, Search, Plus, X, Mail, Edit, Save, XCircle } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

interface SupportTicket {
  id: string;
  tenantName: string;
  tenantSlug: string;
  subject: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  email?: string;
  resendEmailId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Array<{ type: string; value: string }>>([]);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<SupportTicket["status"]>("open");
  const [editPriority, setEditPriority] = useState<SupportTicket["priority"]>("medium");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tableWidth, setTableWidth] = useState<number>(0);
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
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      setEditStatus(selectedTicket.status);
      setEditPriority(selectedTicket.priority);
      setEditNotes(selectedTicket.notes || "");
      setIsEditing(false);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/support`);
      const data = await response.json();
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
    } finally {
      setLoading(false);
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

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
  };

  const handleSaveTicket = async () => {
    if (!selectedTicket) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          ticketId: selectedTicket.id,
          status: editStatus,
          priority: editPriority,
          notes: editNotes,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Update local state
        const updatedTicket = { ...selectedTicket, status: editStatus, priority: editPriority, notes: editNotes };
        setSelectedTicket(updatedTicket);
        setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
        setIsEditing(false);
      } else {
        alert("Failed to update ticket");
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      alert("Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !ticket.subject.toLowerCase().includes(query) &&
        !ticket.tenantName.toLowerCase().includes(query) &&
        !ticket.email?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    for (const filter of activeFilters) {
      if (filter.type === "Status" && ticket.status !== filter.value) return false;
      if (filter.type === "Priority" && ticket.priority !== filter.value.toLowerCase()) return false;
    }

    return true;
  });

  const statusOptions = ["open", "in_progress", "resolved", "closed"];
  const priorityOptions = ["urgent", "high", "medium", "low"];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      case "in_progress":
        return <Clock className="w-3.5 h-3.5 text-blue-600" />;
      case "resolved":
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
      case "closed":
        return <CheckCircle className="w-3.5 h-3.5 text-gray-600" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Loading support tickets...
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
            <div>
              <h1 className="text-[1.625rem] font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Support
              </h1>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Manage support tickets and customer inquiries
              </p>
            </div>
            <motion.button
              onClick={async () => {
                try {
                  const response = await fetch("/api/admin/support/sync", { method: "POST" });
                  const data = await response.json();
                  if (response.ok) {
                    alert(`Synced successfully! Created ${data.ticketsCreated} new tickets, updated ${data.ticketsUpdated} existing tickets.`);
                    fetchTickets(); // Refresh the list
                  } else {
                    alert(`Sync failed: ${data.error || "Unknown error"}`);
                  }
                } catch (error) {
                  console.error("Error syncing:", error);
                  alert("Failed to sync from Resend");
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 shadow-sm"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Sync from Resend
            </motion.button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <AnimatePresence mode="popLayout">
            <motion.div
              key="stat-open"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Open
                </p>
              </div>
              <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                {tickets.filter((t) => t.status === "open").length}
              </p>
            </motion.div>

            <motion.div
              key="stat-in-progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  In Progress
                </p>
              </div>
              <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                {tickets.filter((t) => t.status === "in_progress").length}
              </p>
            </motion.div>

            <motion.div
              key="stat-resolved"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Resolved
                </p>
              </div>
              <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                {tickets.filter((t) => t.status === "resolved").length}
              </p>
            </motion.div>

            <motion.div
              key="stat-total"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-gray-600" />
                <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Total
                </p>
              </div>
              <p className="text-xl font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                {tickets.length}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Search Bar */}
        <div className="mb-3">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-1.5">
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
          {priorityOptions.length > 0 && (
            <FilterButton
              label="Priority"
              options={priorityOptions}
              isOpen={openFilterDropdown === "Priority"}
              onToggle={() => setOpenFilterDropdown(openFilterDropdown === "Priority" ? null : "Priority")}
              onClose={closeAllDropdowns}
              onAddFilter={handleAddFilter}
            />
          )}
            </div>

        <div className={`grid grid-cols-1 gap-6 ${selectedTicket ? 'lg:grid-cols-3' : ''}`}>
          {/* Tickets Table */}
          <div className={selectedTicket ? 'lg:col-span-2' : ''}>
            <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Ticket
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Tenant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <AnimatePresence mode="popLayout">
              {filteredTickets.length > 0 ? (
                        filteredTickets.map((ticket, index) => (
                          <motion.tr
                    key={ticket.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                            onClick={() => handleOpenTicket(ticket)}
                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedTicket?.id === ticket.id ? 'bg-gray-50' : ''}`}
                          >
                            <td className="px-4 py-3 border-b border-gray-200">
                              <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                                <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {ticket.subject}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200">
                              <div>
                                <p className="text-sm text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {ticket.tenantName}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  /{ticket.tenantSlug}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200">
                              {ticket.email ? (
                                <a
                                  href={`mailto:${ticket.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                                >
                                  <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  {ticket.email}
                                </a>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${
                        ticket.status === 'open'
                          ? 'bg-red-100 text-red-800'
                          : ticket.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : ticket.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                              {new Date(ticket.updatedAt).toLocaleDateString()}
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-sm font-medium text-gray-900 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              No support tickets
                            </h3>
                            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                              {searchQuery || activeFilters.length > 0
                                ? "No tickets match your current filters"
                                : "All support tickets will appear here"}
                            </p>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Ticket Detail Sidebar */}
          {selectedTicket && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Ticket Details
                </h2>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <XCircle className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {!isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Subject</label>
                    <p className="text-sm text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      {selectedTicket.subject}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Tenant</label>
                    <p className="text-sm text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      {selectedTicket.tenantName} (/{selectedTicket.tenantSlug})
                    </p>
                  </div>

                  {selectedTicket.email && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Email</label>
                      <div className="flex flex-col gap-2">
                        <a
                          href={`mailto:${selectedTicket.email}`}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                          {selectedTicket.email}
                        </a>
                        {selectedTicket.resendEmailId && (
                          <a
                            href={`https://resend.com/emails/${selectedTicket.resendEmailId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 underline"
                          >
                            View in Resend →
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Status</label>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${
                      selectedTicket.status === 'open'
                        ? 'bg-red-100 text-red-800'
                        : selectedTicket.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedTicket.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Priority</label>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>

                  {selectedTicket.description && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Description</label>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                        {selectedTicket.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Notes</label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      {selectedTicket.notes || "No notes"}
                    </p>
                  </div>

                  <motion.button
                    onClick={() => setIsEditing(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Ticket
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Status</label>
                    <Dropdown
                      value={editStatus}
                      onChange={(value) => setEditStatus(value as SupportTicket["status"])}
                      options={[
                        { value: "open", label: "Open" },
                        { value: "in_progress", label: "In Progress" },
                        { value: "resolved", label: "Resolved" },
                        { value: "closed", label: "Closed" },
                      ]}
                      size="md"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Priority</label>
                    <Dropdown
                      value={editPriority}
                      onChange={(value) => setEditPriority(value as SupportTicket["priority"])}
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                        { value: "urgent", label: "Urgent" },
                      ]}
                      size="md"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all resize-none"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                      placeholder="Add notes about this ticket..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleSaveTicket}
                      disabled={saving}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setIsEditing(false);
                        setEditStatus(selectedTicket.status);
                        setEditPriority(selectedTicket.priority);
                        setEditNotes(selectedTicket.notes || "");
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
              )}
            </div>

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
                className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left rounded-md transition-colors capitalize"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              >
                {option.replace('_', ' ')}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
