"use client";

import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, Users, BarChart3, CreditCard, Settings, Search, Shield, HelpCircle, Bot } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<string>("dashboard");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mockConversation, setMockConversation] = useState<Array<{type: 'user' | 'ai', message: string}>>([]);

  // AI suggestions for admin
  const aiSuggestions = [
    "How many active tenants do we have?",
    "Show me recent billing activity",
    "What integrations are most popular?",
    "List tenants with overdue payments",
    "Show platform analytics",
  ];

  // Update selected item when pathname changes
  useEffect(() => {
    // Handle admin routes properly - only set if pathname matches exactly or starts with the route
    if (pathname === '/admin' || pathname === '/admin/') {
      setSelectedItem('dashboard');
    } else if (pathname.startsWith('/admin/tenants') && pathname !== '/admin/tenants/new') {
      setSelectedItem('tenants');
    } else if (pathname.startsWith('/admin/ai-agents') && pathname !== '/admin/ai-agents/new') {
      setSelectedItem('ai-agents');
    } else if (pathname.startsWith('/admin/analytics')) {
      setSelectedItem('analytics');
    } else if (pathname.startsWith('/admin/billing')) {
      setSelectedItem('billing');
    } else if (pathname.startsWith('/admin/support')) {
      setSelectedItem('support');
    } else if (pathname.startsWith('/admin/settings')) {
      setSelectedItem('settings');
    } else {
      // Don't set a default - let it remain unselected if no match
      setSelectedItem('');
    }
  }, [pathname]);

  // Handle Command+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isSearchFocused) {
          searchInputRef.current?.blur();
          setIsSearchFocused(false);
        } else {
          searchInputRef.current?.focus();
          setIsSearchFocused(true);
        }
      }
      if (e.key === 'Escape' && isSearchFocused) {
        searchInputRef.current?.blur();
        setIsSearchFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused]);

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard strokeWidth={1.5} className="w-5 h-5" />, href: '/admin' },
    { id: "tenants", label: "Tenants", icon: <Users strokeWidth={1.5} className="w-5 h-5" />, href: '/admin/tenants' },
    { id: "ai-agents", label: "AI Agents", icon: <Bot strokeWidth={1.5} className="w-5 h-5" />, href: '/admin/ai-agents' },
    { id: "analytics", label: "Analytics", icon: <BarChart3 strokeWidth={1.5} className="w-5 h-5" />, href: '/admin/analytics' },
    { id: "billing", label: "Billing", icon: <CreditCard strokeWidth={1.5} className="w-5 h-5" />, href: '/admin/billing' },
    { id: "support", label: "Support", icon: <HelpCircle strokeWidth={1.5} className="w-5 h-5" />, href: '/admin/support' },
    { id: "settings", label: "Settings", icon: <Settings strokeWidth={1.5} className="w-5 h-5" />, href: '/admin/settings' },
  ];

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      {/* Blur Overlay */}
      {isSearchFocused && (
        <div className="fixed inset-0 z-40 bg-black/2 backdrop-blur-[1px]" onClick={() => setIsSearchFocused(false)} />
      )}

      {/* Fixed Top Header Row - Admin branding and Ask AI */}
      <div className={cn("fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 py-3 sm:py-4 transition-all duration-300")}>
        <div className="relative flex items-center">
          {/* Admin branding - no background */}
          <div className={cn("flex items-center gap-2 sm:gap-3 transition-all duration-500 px-3 sm:px-4 py-1.5 sm:py-2", isSearchFocused && "blur-[1px]")}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="hidden sm:block">
              <span className="text-base sm:text-lg font-medium text-gray-900">Admin</span>
              <span className="block text-xs text-gray-500 -mt-0.5">Control Panel</span>
            </div>
            <div className="sm:hidden">
              <span className="text-sm font-medium text-gray-900">Admin</span>
            </div>
          </div>

          {/* Ask AI Bar - Centered - Glassmorphic */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '8px' }}>
            <div
              className={cn(
                "flex flex-col backdrop-blur-md bg-white/50 border border-gray-200 overflow-hidden",
                isSearchFocused ? "px-4 sm:px-6 py-3 sm:py-4 shadow-sm" : "px-3 sm:px-4 py-2 sm:py-2.5"
              )}
              style={{
                width: isSearchFocused ? 'clamp(320px, 90vw, 600px)' : 'clamp(200px, 60vw, 280px)',
                minHeight: isSearchFocused ? '400px' : 'auto',
                borderRadius: '20px',
                transition: 'width 0.3s ease-in-out, min-height 0.3s ease-in-out, padding 0.3s ease-in-out',
              }}
            >
              <div
                className="flex items-center gap-2 sm:gap-3"
                onMouseDown={(e) => {
                  if (e.target !== searchInputRef.current) {
                    e.preventDefault();
                  }
                }}
              >
                <Search strokeWidth={1.5} className={cn("text-gray-400 flex-shrink-0 transition-all", isSearchFocused ? "h-5 w-5" : "h-4 w-4")} style={{ transitionDuration: '0.3s' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={mockConversation.length > 0 ? "Type your message..." : "Ask AI about tenants, billing, analytics..."}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const message = e.currentTarget.value.trim();
                      e.currentTarget.value = '';

                      setMockConversation(prev => [...prev, {type: 'user', message}]);

                      setTimeout(() => {
                        const responses = [
                          "I found 47 active tenants this month, up 12% from last month.",
                          "Here's what I see in billing: $23,400 in MRR with 8% growth.",
                          "Top integrations: Stripe (34 tenants), OpenAI (28 tenants), Slack (19 tenants).",
                          "I found 3 tenants with overdue payments. Would you like me to send reminders?",
                          "Platform analytics show 94.2% uptime and 2.3M API calls this week."
                        ];
                        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                        setMockConversation(prev => [...prev, {type: 'ai', message: randomResponse}]);
                      }, 1500);
                    }
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!searchInputRef.current?.matches(':focus-within')) {
                        setIsSearchFocused(false);
                      }
                    }, 200);
                  }}
                  className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none flex-1 min-w-0"
                  style={{ width: '100%' }}
                />
                <div className="hidden sm:flex items-center gap-0.5 text-xs font-medium text-gray-400 flex-shrink-0">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </div>

              {/* Content based on state */}
              {isSearchFocused && (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  style={{
                    animation: 'slideDown 0.3s ease-in-out',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgb(229, 231, 235)',
                  }}
                >
                  {mockConversation.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 max-h-48 overflow-y-auto">
                        {mockConversation.map((msg, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] text-sm px-3 py-2 rounded-lg ${
                              msg.type === 'user'
                                ? 'bg-gray-900 text-white'
                                : 'bg-white/60 text-gray-700'
                            }`}>
                              {msg.message}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={() => setMockConversation([])}
                          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100/50 hover:bg-gray-200/50 rounded-full border border-gray-200 transition-all"
                        >
                          Clear conversation
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 mb-3">Suggestions</p>
                      <div className="flex flex-col gap-2">
                        {aiSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setMockConversation(prev => [...prev, {type: 'user', message: suggestion}]);
                              setTimeout(() => {
                                const responses = [
                                  "I found 47 active tenants this month, up 12% from last month.",
                                  "Here's what I see in billing: $23,400 in MRR with 8% growth.",
                                  "Top integrations: Stripe (34 tenants), OpenAI (28 tenants), Slack (19 tenants).",
                                  "I found 3 tenants with overdue payments. Would you like me to send reminders?",
                                  "Platform analytics show 94.2% uptime and 2.3M API calls this week."
                                ];
                                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                                setMockConversation(prev => [...prev, {type: 'ai', message: randomResponse}]);
                              }, 1500);
                            }}
                            className="text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg px-3 py-2 transition-all duration-200"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Left Sidebar Nav - Centered Vertically */}
      <TooltipProvider>
      <div className="fixed left-2 sm:left-4 top-1/2 z-50 -translate-y-1/2">
        <div className="rounded-full border border-gray-200 bg-gray-50 px-1.5 sm:px-2 py-2 sm:py-3">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            {navItems.map((item) => {
                const isSelected = selectedItem === item.id;
              return (
                  <Tooltip key={item.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        prefetch={true}
                        className={cn(
                          "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border text-gray-600 transition-all duration-200 cursor-pointer",
                          isSelected
                            ? "bg-white border-gray-200 text-gray-900 shadow-sm"
                            : "border-transparent hover:border-gray-200 hover:bg-white hover:text-gray-900"
                        )}
                      >
                        {item.icon}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
      </TooltipProvider>

      {/* Main Content Area */}
      <div className="flex-1 pt-24 sm:pt-32 pl-16 sm:pl-24 transition-all duration-300">
        <div className="page-transition-wrapper">
          {children}
        </div>
      </div>

      {/* Custom styles for animations */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
