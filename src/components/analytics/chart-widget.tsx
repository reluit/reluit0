"use client";

import { ReactNode, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

interface ChartWidgetProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  isEditing?: boolean;
  onRemove?: () => void;
}

export function ChartWidget({ id, title, description, children, isEditing = false, onRemove }: ChartWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  useEffect(() => {
    const mainContent = document.querySelector('.page-transition-wrapper') as HTMLElement;
    if (mainContent) {
      if (isModalOpen) {
        mainContent.style.filter = 'blur(1px)';
        mainContent.style.transition = 'filter 0.3s ease-in-out';
      } else {
        mainContent.style.filter = 'none';
      }
    }
  }, [isModalOpen]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Mock data for the right sidebar - in real app, this would come from props or API
  const getDetailData = () => {
    return {
      total: "1,234",
      average: "45.2",
      peak: "89",
      trend: "+12.5%",
      period: "Last 30 days",
      breakdown: [
        { label: "Category A", value: "456", percentage: "37%" },
        { label: "Category B", value: "389", percentage: "32%" },
        { label: "Category C", value: "389", percentage: "31%" },
      ]
    };
  };

  const detailData = getDetailData();

  return (
    <>
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow focus:outline-none"
      tabIndex={-1}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {isEditing && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors p-1 touch-none focus:outline-none"
            >
              <GripVertical className="h-5 w-5" strokeWidth={1.5} />
            </button>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {isEditing && onRemove && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 focus:outline-none"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 focus:outline-none">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="h-[280px] focus:outline-none" tabIndex={-1}>
        {children}
      </div>
      {!isEditing && (
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-full bg-white hover:bg-gray-50 transition-colors"
          >
            View details
          </button>
        </div>
      )}
    </div>

    {/* Modal - Rendered via Portal */}
    {typeof window !== 'undefined' && createPortal(
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-[1px]"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed left-1/2 top-1/2 z-[100] w-full max-w-6xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-white/50 backdrop-blur-md shadow-lg overflow-hidden flex flex-col"
            >
              <div className="flex-1 flex overflow-hidden">
                {/* Main Chart Area */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Header */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">{title}</h2>
                    {description && (
                      <p className="text-sm text-gray-600">{description}</p>
                    )}
                  </div>

                  {/* Chart Content */}
                  <div className="flex-1 min-h-0">
                    {children}
                  </div>
                </div>

                {/* Right Sidebar - Detailed Data */}
                <div className="w-80 border-l border-white/30 bg-white/30 p-6 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Key Metrics</h3>
                      <div className="space-y-4">
                        <div className="bg-white/60 rounded-lg p-4 border border-white/40">
                          <p className="text-xs text-gray-500 mb-1">Total</p>
                          <p className="text-2xl font-semibold text-gray-900">{detailData.total}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-4 border border-white/40">
                          <p className="text-xs text-gray-500 mb-1">Average</p>
                          <p className="text-2xl font-semibold text-gray-900">{detailData.average}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-4 border border-white/40">
                          <p className="text-xs text-gray-500 mb-1">Peak</p>
                          <p className="text-2xl font-semibold text-gray-900">{detailData.peak}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-4 border border-white/40">
                          <p className="text-xs text-gray-500 mb-1">Trend</p>
                          <p className="text-lg font-semibold text-green-600">{detailData.trend}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Breakdown</h3>
                      <div className="space-y-3">
                        {detailData.breakdown.map((item, index) => (
                          <div key={index} className="bg-white/60 rounded-lg p-3 border border-white/40">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-gray-700">{item.label}</p>
                              <p className="text-xs text-gray-500">{item.percentage}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">{detailData.period}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
  </>
  );
}

