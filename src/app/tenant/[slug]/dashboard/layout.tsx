"use client";

import { useState, useEffect, useRef } from "react";
import { Home, Zap, Cpu, Plug, Settings, Search } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ConversationDrawer } from "@/components/conversation-drawer";
import { IntegrationDrawer } from "@/components/integrations/integration-drawer";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

interface DockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Extract slug from path: /[slug]/dashboard/...
  const slugMatch = pathname.match(/^\/([^/]+)/);
  const slug = slugMatch ? slugMatch[1] : '';
  const currentPage = pathname === `/${slug}/dashboard` ? "home" : pathname.split("/dashboard/")[1] || "home";
  const [selectedItem, setSelectedItem] = useState<string>(currentPage);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mockConversation, setMockConversation] = useState<Array<{type: 'user' | 'ai', message: string}>>([]);
  const [isIntegrationDrawerOpen, setIsIntegrationDrawerOpen] = useState(false);

  // AI suggestions
  const aiSuggestions = [
    "How can I optimize my call handling?",
    "Show me usage statistics",
    "How do I customize my agent?",
    "Get support help",
    "What integrations are available?",
  ];

  // Update selected item when pathname changes
  useEffect(() => {
    setSelectedItem(currentPage);
  }, [currentPage]);

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
      // Close on Escape
      if (e.key === 'Escape' && isSearchFocused) {
        searchInputRef.current?.blur();
        setIsSearchFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused]);

  // Listen for integration drawer events
  useEffect(() => {
    const handleOpenIntegrationDrawer = () => setIsIntegrationDrawerOpen(true);
    const handleCloseIntegrationDrawer = () => setIsIntegrationDrawerOpen(false);

    window.addEventListener('openIntegrationDrawer', handleOpenIntegrationDrawer);
    window.addEventListener('closeIntegrationDrawer', handleCloseIntegrationDrawer);
    return () => {
      window.removeEventListener('openIntegrationDrawer', handleOpenIntegrationDrawer);
      window.removeEventListener('closeIntegrationDrawer', handleCloseIntegrationDrawer);
    };
  }, []);

  const dockItems: DockItem[] = [
    { id: "home", label: "Home", icon: <Home strokeWidth={1.5} className="w-5 h-5" />, href: `/${slug}/dashboard` },
    { id: "evaluate", label: "Evaluate", icon: <Zap strokeWidth={1.5} className="w-5 h-5" />, href: `/${slug}/dashboard/evaluate` },
    { id: "agent", label: "Agent", icon: <Cpu strokeWidth={1.5} className="w-5 h-5" />, href: `/${slug}/dashboard/agent` },
    { id: "integrations", label: "Integrations", icon: <Plug strokeWidth={1.5} className="w-5 h-5" />, href: `/${slug}/dashboard/integrations` },
    { id: "settings", label: "Settings", icon: <Settings strokeWidth={1.5} className="w-5 h-5" />, href: `/${slug}/dashboard/settings` },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex min-h-screen flex-col bg-white">
        {/* Blur Overlay */}
        {isSearchFocused && (
          <div className="fixed inset-0 z-40 bg-black/2 backdrop-blur-[1px]" onClick={() => setIsSearchFocused(false)} />
        )}
        {isIntegrationDrawerOpen && (
          <div className="fixed inset-0 z-[55] bg-black/10" />
        )}

        {/* Fixed Top Header Row - reluit x partnership and Ask AI */}
        <div className={cn("fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300", isIntegrationDrawerOpen && "blur-[1px]")}>
          <div className="relative flex items-center">
            {/* reluit x partnership */}
            <div className={cn("flex items-baseline gap-2 transition-all duration-500 px-4 py-2 rounded-full backdrop-blur-md bg-white/50", isSearchFocused && "blur-[1px]")} style={{ paddingLeft: '44px', width: 'fit-content' }}>
              <span className="text-[1.375rem] font-medium tracking-tight text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                reluit
              </span>
              <span className="text-xs font-extralight text-gray-900 leading-none" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', transform: 'translateY(-2px)', color: '#000000' }}>
                ×
              </span>
              <span className="text-[1.375rem] font-medium tracking-tight text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                partnership
              </span>
            </div>

            {/* Ask AI Bar - Centered */}
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
                    // Don't prevent default on input focus - allow normal input focusing
                    if (e.target !== searchInputRef.current) {
                      // Only prevent blur for other elements inside the bar
                      e.preventDefault();
                    }
                  }}
                >
                  <Search strokeWidth={1.5} className={cn("text-gray-400 flex-shrink-0 transition-all", isSearchFocused ? "h-5 w-5" : "h-4 w-4")} style={{ transitionDuration: '0.3s' }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={mockConversation.length > 0 ? "Type your message..." : "Ask AI..."}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const message = e.currentTarget.value.trim();
                        e.currentTarget.value = '';

                        // Add user message
                        setMockConversation(prev => [...prev, {type: 'user', message}]);

                        // Simulate AI response after delay
                        setTimeout(() => {
                          const responses = [
                            "I can help you with that. Based on your current data, here's what I found...",
                            "Great question! Let me show you the relevant metrics and insights...",
                            "That's a common workflow. I recommend setting up automated triggers for this...",
                            "I'll help you optimize that. Here are some best practices I've identified...",
                            "Based on your team's performance, I suggest focusing on these key areas..."
                          ];
                          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                          setMockConversation(prev => [...prev, {type: 'ai', message: randomResponse}]);
                        }, 1500);
                      }
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      // Delay blur to allow for clicks inside the bar
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
                      // Prevent input from blurring when clicking inside the expanded content
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
                      // Conversation flow
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
                        {/* Always show clear button when conversation exists */}
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
                      // Suggestions only (when no conversation)
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 mb-3">Suggestions</p>
                        <div className="flex flex-col gap-2">
                          {aiSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                // Add user message
                                setMockConversation(prev => [...prev, {type: 'user', message: suggestion}]);
                                // Simulate AI response after delay
                                setTimeout(() => {
                                  const responses = [
                                    "I can help you with that. Based on your current data, here's what I found...",
                                    "Great question! Let me show you the relevant metrics and insights...",
                                    "That's a common workflow. I recommend setting up automated triggers for this...",
                                    "I'll help you optimize that. Here are some best practices I've identified...",
                                    "Based on your team's performance, I suggest focusing on these key areas..."
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

        {/* Fixed Left Sidebar Dock - Centered Vertically */}
        <div className={cn("fixed left-4 top-1/2 z-50 -translate-y-1/2 transition-all duration-300", isIntegrationDrawerOpen && "blur-[1px]")}>
          <div className="rounded-full border border-gray-200 bg-gray-50 px-2 py-3">
            <div className="flex flex-col gap-2">
              {dockItems.map((item) => {
                const isSelected = selectedItem === item.id;
                return (
                  <Tooltip key={item.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border text-gray-600 transition-all duration-200",
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

        {/* Main Content Area */}
        <div className={cn("flex-1 pt-32 pl-24 transition-all duration-300", (isSearchFocused || isIntegrationDrawerOpen) && "blur-[1px]")}>
          <div className="page-transition-wrapper">
            {children}
          </div>
        </div>

        {/* Conversation Drawer - Rendered at layout level */}
        <ConversationDrawerWrapper />

        {/* Integration Drawer - Rendered at layout level */}
        <IntegrationDrawerWrapper />
      </div>
    </TooltipProvider>
  );
}

// Conversation Drawer Wrapper Component
function ConversationDrawerWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<any>(null);

  useEffect(() => {
    const handleOpenDrawer = () => {
      const stored = sessionStorage.getItem('selectedConversation');
      if (stored) {
        setConversation(JSON.parse(stored));
        setIsOpen(true);
      }
    };

    window.addEventListener('openConversationDrawer', handleOpenDrawer);
    return () => window.removeEventListener('openConversationDrawer', handleOpenDrawer);
  }, []);

  useEffect(() => {
    // Add blur class to main content when drawer is open
    const mainContent = document.querySelector('.page-transition-wrapper') as HTMLElement;
    if (mainContent) {
      if (isOpen) {
        mainContent.style.filter = 'blur(1px)';
        mainContent.style.transition = 'filter 0.3s ease-in-out';
      } else {
        mainContent.style.filter = 'none';
      }
    }
  }, [isOpen]);

  return (
    <ConversationDrawer
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        setConversation(null);
      }}
      conversation={conversation}
    />
  );
}

// Integration Drawer Wrapper Component
function IntegrationDrawerWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [integration, setIntegration] = useState<any>(null);

  useEffect(() => {
    const handleOpenDrawer = () => {
      const stored = sessionStorage.getItem('selectedIntegration');
      if (stored) {
        setIntegration(JSON.parse(stored));
        setIsOpen(true);
      }
    };

    const handleCloseDrawer = () => {
      setIsOpen(false);
      setIntegration(null);
    };

    window.addEventListener('openIntegrationDrawer', handleOpenDrawer);
    window.addEventListener('closeIntegrationDrawer', handleCloseDrawer);
    return () => {
      window.removeEventListener('openIntegrationDrawer', handleOpenDrawer);
      window.removeEventListener('closeIntegrationDrawer', handleCloseDrawer);
    };
  }, []);

  return (
    <IntegrationDrawer
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        setIntegration(null);
        sessionStorage.removeItem('selectedIntegration');
        window.dispatchEvent(new Event('closeIntegrationDrawer'));
      }}
      integration={integration}
    />
  );
}
