"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DatePicker } from "@/components/analytics/date-picker";
import { ChartWidget } from "@/components/analytics/chart-widget";
import { SortableWidgetItem } from "@/components/analytics/sortable-widget-item";
import {
  CallVolumeChart,
  CallDurationChart,
  CallOutcomesChart,
  SentimentChart,
  PeakHoursChart,
  BookingActivityChart,
  CallResponseMetricsChart,
  TopCallReasonsChart,
  MonthlySummaryChart,
  CallQualityScoreChart,
  CostChart,
  LLMCostChart,
} from "@/components/analytics/charts";

// Force dynamic rendering for local dev
export const dynamic = "force-dynamic";

// Get time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
};

// Get slug from pathname
function getSlug(pathname: string): string {
  const match = pathname.match(/^\/([^/]+)/);
  return match ? match[1] : '';
}

const allChartWidgets = [
  { id: "call-outcomes", title: "Call Outcomes Breakdown", description: "Distribution of call results", component: CallOutcomesChart },
  { id: "sentiment", title: "Sentiment Analysis", description: "Customer sentiment breakdown", component: SentimentChart },
  { id: "peak-hours", title: "Peak Call Hours", description: "Calls by hour of day", component: PeakHoursChart },
  { id: "booking-activity", title: "Booking Activity", description: "Appointments booked over time", component: BookingActivityChart },
  { id: "response-metrics", title: "Call Response Metrics", description: "Response time and resolution rates", component: CallResponseMetricsChart },
  { id: "top-reasons", title: "Top Call Reasons", description: "Most common inquiry types", component: TopCallReasonsChart },
  { id: "quality-score", title: "Call Quality Score", description: "Overall quality assessment", component: CallQualityScoreChart },
];

// Initial widgets to show (excluding ones shown in main section: call-volume, call-duration, monthly-summary)
const initialWidgetIds = ["call-outcomes", "sentiment", "booking-activity", "quality-score"];

export default function HomePage() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const slug = getSlug(pathname);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dateRange, setDateRange] = useState<"thisWeek" | "thisMonth" | "lastMonth" | "last3Months">("thisMonth");
  const [activeStatTab, setActiveStatTab] = useState<string>("monthly-summary");
  const [widgets, setWidgets] = useState(() =>
    allChartWidgets.filter(w => initialWidgetIds.includes(w.id))
  );
  const [tempWidgets, setTempWidgets] = useState(widgets);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [{ width: analyticsWidth, offset: analyticsOffset }, setAnalyticsLayout] = useState<{ width: number; offset: number }>({ width: 0, offset: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setTempWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = [...items];
        newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, items[oldIndex]);
        return newItems;
      });
    }
  };

  const handleEditOpen = () => {
    setTempWidgets([...widgets]);
    setIsEditing(true);
  };

  const handleSave = () => {
    setWidgets([...tempWidgets]);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempWidgets([...widgets]);
    setIsEditing(false);
  };

  useEffect(() => {
    // Scroll to top on mount for smooth transition
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const updateLayout = () => {
      const headerEl = headerRef.current;
      const bellEl = bellRef.current;
      const contentEl = contentRef.current;
      if (!headerEl || !bellEl || !contentEl) {
        return;
      }

      const headerRect = headerEl.getBoundingClientRect();
      const bellRect = bellEl.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();

      const textLeft = headerRect.left;
      const width = bellRect.right - textLeft + 850; // Further extension to the right
      const offset = textLeft - contentRect.left - 72; // Move left (matches paddingLeft)

      if (width > 0) {
        setAnalyticsLayout({ width, offset });
      }
    };

    const frame = window.requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  return (
    <div className="page-transition-wrapper">
      <div
        ref={contentRef}
        className="page-content"
        style={{ 
          paddingLeft: '0px',
          paddingTop: '0px',
        }}
      >
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <p className="mb-0.5 text-[0.9375rem] font-medium text-gray-400" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            My Workspace
          </p>
          <div className="relative">
            <div ref={headerRef} className="flex items-center gap-12">
              <h1 className="text-[1.625rem] font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Good {getGreeting()}, Partnership
              </h1>
              
              {/* Notification Bell - Hidden for width calculation */}
              <button
                ref={bellRef}
                onClick={() => setIsNotificationOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 flex-shrink-0 mr-[-200px] opacity-0 pointer-events-none"
              >
                <Bell strokeWidth={1.5} className="h-5 w-5" />
              </button>
            </div>
            
            {/* Notification Bell - Positioned at right edge of analytics */}
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="absolute flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 z-10"
              style={{
                right: `calc(100% - ${analyticsOffset || 72}px - ${analyticsWidth || 0}px + 72px)`,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <Bell strokeWidth={1.5} className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Analytics Section */}
        <div
          className="mt-6 rounded-2xl bg-gray-50 p-8"
          style={{
            marginLeft: analyticsOffset || 72,
            minHeight: 'calc(100vh - 240px)',
            width: analyticsWidth ? `${analyticsWidth}px` : 'auto',
            transition: 'width 320ms ease, margin 320ms ease',
          }}
        >
          {/* Header with Date Picker and Edit Button */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <DatePicker value={dateRange} onChange={setDateRange} />
            <button
              onClick={handleEditOpen}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 transition-colors border border-gray-200 rounded-full bg-white"
            >
              Edit
            </button>
          </div>

          {/* Non-configurable Chart Section with Stat Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Call Analytics</h2>
                <p className="text-sm text-gray-500">Overview of call metrics and performance</p>
              </div>
            </div>
            
            {/* Stat Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveStatTab("monthly-summary")}
                className={`px-4 py-2 text-sm font-medium pb-2 whitespace-nowrap transition-colors ${
                  activeStatTab === "monthly-summary"
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <div className="text-left">
                  <p className="text-xs text-gray-500 mb-0.5">Monthly summary</p>
                  <p className="text-lg font-semibold">Overview</p>
                </div>
              </button>
              <button
                onClick={() => setActiveStatTab("number-of-calls")}
                className={`px-4 py-2 text-sm font-medium pb-2 whitespace-nowrap transition-colors ${
                  activeStatTab === "number-of-calls"
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <div className="text-left">
                  <p className="text-xs text-gray-500 mb-0.5">Number of calls</p>
                  <p className="text-lg font-semibold">15</p>
                </div>
              </button>
              <button
                onClick={() => setActiveStatTab("average-duration")}
                className={`px-4 py-2 text-sm font-medium pb-2 whitespace-nowrap transition-colors ${
                  activeStatTab === "average-duration"
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <div className="text-left">
                  <p className="text-xs text-gray-500 mb-0.5">Average duration</p>
                  <p className="text-lg font-semibold">0:43</p>
                </div>
              </button>
              <button
                onClick={() => setActiveStatTab("total-cost")}
                className={`px-4 py-2 text-sm font-medium pb-2 whitespace-nowrap transition-colors ${
                  activeStatTab === "total-cost"
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <div className="text-left">
                  <p className="text-xs text-gray-500 mb-0.5">Total cost</p>
                  <p className="text-lg font-semibold">4.36K credits</p>
                </div>
              </button>
              <button
                onClick={() => setActiveStatTab("average-cost")}
                className={`px-4 py-2 text-sm font-medium pb-2 whitespace-nowrap transition-colors ${
                  activeStatTab === "average-cost"
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <div className="text-left">
                  <p className="text-xs text-gray-500 mb-0.5">Average cost</p>
                  <p className="text-lg font-semibold">$0.00261/min</p>
                </div>
              </button>
            </div>

            {/* Chart based on active tab */}
            <div className="h-80 mb-4">
              {activeStatTab === "monthly-summary" && <MonthlySummaryChart />}
              {activeStatTab === "number-of-calls" && <CallVolumeChart />}
              {activeStatTab === "average-duration" && <CallDurationChart />}
              {activeStatTab === "total-cost" && <CostChart />}
              {activeStatTab === "average-cost" && <LLMCostChart />}
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <Link href={`/${slug}/dashboard/evaluate`} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-full bg-white hover:bg-gray-50 transition-colors flex items-center gap-2">
                View calls
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Configurable Chart Widgets - 2 Column Grid */}
          <div className="grid grid-cols-2 gap-6">
            {widgets.map((widget) => {
              const ChartComponent = widget.component;
              return (
                <ChartWidget
                  key={widget.id}
                  id={widget.id}
                  title={widget.title}
                  description={widget.description}
                  isEditing={false}
                >
                  <ChartComponent />
                </ChartWidget>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Widgets Modal */}
      <AnimatePresence>
        {isEditing && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"
              onClick={handleCancel}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[80vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-white/50 backdrop-blur-md p-6 shadow-lg"
            >
              <button
                onClick={handleCancel}
                className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
              
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Dashboard settings</h2>
                  <p className="text-sm text-gray-600">
                    Configure the default dashboard charts to better suit your needs.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={tempWidgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-3">
                      {tempWidgets.map((widget) => (
                        <SortableWidgetItem
                          key={widget.id}
                          id={widget.id}
                          title={widget.title}
                          description={widget.description}
                          onRemove={() => {
                            if (tempWidgets.length > 1) {
                              setTempWidgets(tempWidgets.filter(w => w.id !== widget.id));
                            }
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {/* Add Chart Button */}
                <button
                  onClick={() => {
                    const availableWidgets = allChartWidgets.filter(w => !tempWidgets.find(aw => aw.id === w.id));
                    if (availableWidgets.length > 0) {
                      setTempWidgets([...tempWidgets, availableWidgets[0]]);
                    }
                  }}
                  className="w-full px-4 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add chart
                </button>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-full bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {isNotificationOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"
              onClick={() => setIsNotificationOpen(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-white/50 backdrop-blur-md p-6 shadow-lg"
            >
              <button
                onClick={() => setIsNotificationOpen(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <p className="text-sm text-gray-600">
                  Your recent updates and alerts
                </p>
              </div>
              
              <div className="mt-4 py-4">
                <p className="text-sm text-gray-500">No new notifications</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

