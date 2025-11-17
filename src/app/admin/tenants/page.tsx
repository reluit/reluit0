"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, ExternalLink, Globe, Calendar, Users, X } from "lucide-react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  setup_complete: boolean;
  domains: Array<{
    id: string;
    domain: string;
    subdomain: string | null;
    is_primary: boolean;
  }>;
  subscription?: {
    id: string;
    status: string;
    current_period_end: string | null;
  };
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Array<{ type: string; value: string }>>([]);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
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
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants");
      const data = await response.json();
      setTenants(data || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
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

  const filteredTenants = tenants.filter((tenant) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !tenant.name.toLowerCase().includes(query) &&
        !tenant.slug.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    for (const filter of activeFilters) {
      if (filter.type === "Status" && filter.value === "Active" && !tenant.setup_complete) return false;
      if (filter.type === "Status" && filter.value === "Inactive" && tenant.setup_complete) return false;
    }

    return true;
  });

  const statusOptions = ["Active", "Inactive"];

  if (loading) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Loading tenants...
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
              Tenants
            </h1>
            <motion.button
              onClick={() => window.location.href = "/admin/tenants/new"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 shadow-sm"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Tenant
            </motion.button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-3">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search tenants..."
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
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg overflow-hidden" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 border-b border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <AnimatePresence mode="popLayout">
            {filteredTenants.length > 0 ? (
                    filteredTenants.map((tenant, index) => {
                  const primaryDomain = tenant.domains.find((d) => d.is_primary) ?? tenant.domains[0];
                  return (
                        <motion.tr
                      key={tenant.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          onClick={() => window.location.href = `/admin/tenants/${tenant.slug}`}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                          <td className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                          </div>
                          <div>
                                <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {tenant.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  /{tenant.slug}
                                </p>
                          </div>
                        </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200">
                            {primaryDomain ? (
                              <div className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                                <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {primaryDomain.domain}
                            </span>
                              </div>
                          ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${
                              tenant.setup_complete
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {tenant.setup_complete ? "Active" : "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                              <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                {new Date(tenant.created_at).toLocaleDateString()}
                              </span>
                        </div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <motion.a
                          href={`/admin/tenants/${tenant.slug}`}
                                onClick={(e) => e.stopPropagation()}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                title="View Details"
                        >
                                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                              </motion.a>
                      </div>
                          </td>
                        </motion.tr>
                  );
                    })
            ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          No tenants found
                        </p>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {filteredTenants.length === 0 && searchQuery && (
          <div className="mt-8 text-center py-12">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              No tenants found matching your search
            </p>
              </div>
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
