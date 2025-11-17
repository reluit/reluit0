"use client";

import { X, Pencil, CornerUpRight, CornerUpLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, MoreVertical, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Waveform } from "@/components/ui/waveform";

interface Conversation {
  id: string;
  date: string;
  agent: string;
  duration: string;
  messages: number;
  status: "Successful" | "Failed" | "Pending";
}

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}

interface Message {
  id: string;
  speaker: "ai" | "user";
  text: string;
  timestamp: string;
  ttsTime?: string;
  asrTime?: string;
}

const mockMessages: Message[] = [
  {
    id: "1",
    speaker: "ai",
    text: "Hi, this is Matt from Reluit. Is now a good time to talk for a minute?",
    timestamp: "0:00",
    ttsTime: "308 ms",
  },
  {
    id: "2",
    speaker: "user",
    text: "What is Reload?",
    timestamp: "0:07",
    asrTime: "111 ms",
  },
  {
    id: "3",
    speaker: "ai",
    text: "Reluit is an AI agency that builds voice agents for businesses. We're in the early stages and currently offering projects at a low cost of five hundred dollars upfront with two hundred and fifty dollars per month for maintenance. This includes credits, upkeep, new features, support, changes, and a managed analytics dashboard. Would you be interested in learning more about how we can tailor a voice AI solution for your company?",
    timestamp: "0:11",
    ttsTime: "1.2s",
  },
];

export function ConversationDrawer({ isOpen, onClose, conversation }: ConversationDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "transcription">("overview");
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Generate mock waveform data (replace with real audio data in production)
  const waveformData = useMemo(() => {
    const data = Array.from({ length: 150 }, (_, i) => {
      // Create sections with different amplitudes
      const section1 = i < 40; // First 40 bars - shorter
      const section2 = i >= 40 && i < 60; // Next 20 bars - even shorter
      const section3 = i >= 60 && i < 90; // Middle section - normal
      const section4 = i >= 90 && i < 110; // Another short section
      const section5 = i >= 110; // End section - normal

      if (section1) {
        return 0.1 + Math.random() * 0.3; // Short lines: 0.1-0.4
      } else if (section2) {
        return 0.08 + Math.random() * 0.2; // Very short lines: 0.08-0.28
      } else if (section3) {
        return 0.3 + Math.random() * 0.4; // Normal lines: 0.3-0.7
      } else if (section4) {
        return 0.12 + Math.random() * 0.25; // Short lines: 0.12-0.37
      } else {
        return 0.25 + Math.random() * 0.45; // Normal lines: 0.25-0.7
      }
    });
    return data;
  }, []);

  // Fetch conversation details when conversation changes
  useEffect(() => {
    if (conversation?.id) {
      fetchConversationDetails();
    }
  }, [conversation?.id]);

  // Initialize audio element
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio();
      audio.src = audioUrl;
      audio.preload = "metadata";
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      setAudioElement(audio);
      
      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [audioUrl]);

  const fetchConversationDetails = async () => {
    if (!conversation?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/tenant/conversations/${conversation.id}`);
      const data = await response.json();

      if (response.ok && data.conversation) {
        setConversationDetails(data.conversation);
        
        // Only set audio URL if conversation has audio
        if (data.conversation.hasAudio && data.audioUrl) {
          setAudioUrl(data.audioUrl);
        } else {
          setAudioUrl(null);
        }
        
        // Use the parsed messages from the API
        if (data.messages && data.messages.length > 0) {
          const formattedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            speaker: msg.speaker,
            text: msg.text,
            timestamp: msg.timestamp,
            ttsTime: undefined, // Not available in API response
            asrTime: undefined, // Not available in API response
          }));
          setMessages(formattedMessages);
        } else if (data.conversation.transcriptSummary) {
          // Fallback to summary if no messages
          const summaryMessages: Message[] = [
            {
              id: "1",
              speaker: "ai",
              text: data.conversation.transcriptSummary,
              timestamp: "0:00",
            },
          ];
          setMessages(summaryMessages);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Error fetching conversation details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSpeedDropdown(false);
      setShowOptionsDropdown(false);
    };

    if (showSpeedDropdown || showOptionsDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSpeedDropdown, showOptionsDropdown]);

  if (!conversation) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-4xl bg-white shadow-xl overflow-y-auto"
          >
            <div className="p-6 lg:p-8">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-medium text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Conversation with {conversation.agent}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Audio Player */}
              <div className="mb-4">
                {/* Waveform */}
                <div className="mb-3" style={{ paddingLeft: '20px', paddingRight: '20px' }}>
                  <Waveform
                    data={waveformData}
                    barWidth={2}
                    barGap={2}
                    barColor="#000000"
                    height={100}
                    fadeEdges={false}
                    onBarClick={(index: number, value: number) => {
                      const percentage = index / waveformData.length;
                      console.log(`Skip to ${(percentage * 100).toFixed(1)}%`);
                    }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handlePlayPause}
                    disabled={!audioUrl || loading}
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-black hover:bg-gray-800 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="1.5" width="3" height="9" />
                        <rect x="7" y="1.5" width="3" height="9" />
                      </svg>
                    ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 1.5L10.5 6L3 10.5V1.5Z" />
                    </svg>
                    )}
                  </button>
                  <button className="text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors flex-shrink-0">
                    <CornerUpLeft className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button className="text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors flex-shrink-0">
                    <CornerUpRight className="h-5 w-5" strokeWidth={2} />
                  </button>

                  <div className="flex items-center gap-3 ml-auto">
                    <div className="relative">
                      <button
                        onClick={() => setShowSpeedDropdown(!showSpeedDropdown)}
                        className="flex items-center gap-1 text-sm text-gray-700 bg-gray-100 border-0 focus:outline-none cursor-pointer font-medium rounded-lg px-3 py-1.5 hover:bg-gray-200 transition-colors"
                      >
                        <span>1.0x</span>
                        <ChevronDown className="h-3 w-3 ml-0.5" strokeWidth={2} />
                      </button>
                      <AnimatePresence>
                        {showSpeedDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[80px]"
                          >
                            {['1.0x', '1.25x', '1.5x', '2.0x'].map((speed) => (
                              <button
                                key={speed}
                                onClick={() => {
                                  console.log(`Speed set to ${speed}`);
                                  setShowSpeedDropdown(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                {speed}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <span className="text-sm text-gray-600 whitespace-nowrap font-medium">
                      {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : conversation.duration}
                    </span>

                    <div className="relative">
                      <button
                        onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                        className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors flex-shrink-0"
                      >
                        <MoreVertical className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <AnimatePresence>
                        {showOptionsDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
                          >
                            <button
                              onClick={() => {
                                if (audioUrl) {
                                  const link = document.createElement('a');
                                  link.href = audioUrl;
                                  link.download = `conversation-${conversation.id}.mp3`;
                                  link.setAttribute('download', '');
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                                setShowOptionsDropdown(false);
                              }}
                              disabled={!audioUrl}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                              </svg>
                              Download audio
                            </button>
                            <button
                              onClick={() => {
                                const transcriptText = messages.map(m => `${m.speaker === 'ai' ? 'AI' : 'User'}: ${m.text}`).join('\n\n');
                                if (transcriptText) {
                                  navigator.clipboard.writeText(transcriptText);
                                }
                                setShowOptionsDropdown(false);
                              }}
                              disabled={messages.length === 0}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              Copy transcript
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-4 py-2 text-sm font-medium pb-2 transition-colors ${
                    activeTab === "overview"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("transcription")}
                  className={`px-4 py-2 text-sm font-medium pb-2 transition-colors ${
                    activeTab === "transcription"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Transcription
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">Loading conversation details...</p>
                      </div>
                    ) : (
                      <>
                    {/* Summary */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                            {conversationDetails?.transcriptSummary || conversationDetails?.callSummaryTitle || "No summary available"}
                      </p>
                    </div>

                    <div className="border-t border-gray-200"></div>

                    {/* Call Status */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-700">Call status</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {conversation.status}
                      </span>
                    </div>

                    <div className="border-t border-gray-200"></div>

                    {/* Date */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-700">Date</span>
                      <span className="text-sm text-gray-900">
                        {conversationDetails?.startTime
                          ? new Date(conversationDetails.startTime * 1000).toLocaleString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : conversation.date}
                      </span>
                    </div>

                    <div className="border-t border-gray-200"></div>

                    {/* Connection duration */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-700">Connection duration</span>
                      <span className="text-sm text-gray-900">
                        {conversationDetails?.duration
                          ? `${Math.floor(conversationDetails.duration / 60)}:${(conversationDetails.duration % 60).toString().padStart(2, '0')}`
                          : conversation.duration}
                      </span>
                    </div>

                    {/* Cost */}
                    {conversationDetails?.cost !== null && conversationDetails?.cost !== undefined && (
                      <>
                    <div className="border-t border-gray-200"></div>
                    <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-gray-700">Cost</span>
                          <span className="text-sm text-gray-900 font-medium">{conversationDetails.cost} credits</span>
                    </div>
                      </>
                    )}

                    {/* LLM Usage */}
                    {conversationDetails?.charging?.llm_usage && (
                      <>
                    <div className="border-t border-gray-200"></div>
                    <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-gray-700">LLM Usage</span>
                          <div className="text-right">
                            {conversationDetails.charging.llm_price && (
                              <p className="text-sm text-gray-900 font-medium">
                                ${conversationDetails.charging.llm_price.toFixed(6)}
                              </p>
                            )}
                            {conversationDetails.charging.llm_charge && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {conversationDetails.charging.llm_charge} credits
                              </p>
                            )}
                          </div>
                    </div>
                      </>
                    )}

                    <div className="border-t border-gray-200"></div>

                        {/* Rating */}
                        {conversationDetails?.rating && (
                          <>
                            <div className="border-t border-gray-200"></div>
                    <div className="flex items-center justify-between py-2">
                              <span className="text-sm font-medium text-gray-700">Rating</span>
                              <span className="text-sm text-gray-900 font-medium">{conversationDetails.rating}/5</span>
                      </div>
                          </>
                        )}

                        {/* Direction */}
                        {conversationDetails?.direction && (
                          <>
                            <div className="border-t border-gray-200"></div>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-sm font-medium text-gray-700">Direction</span>
                              <span className="text-sm text-gray-900 capitalize">{conversationDetails.direction}</span>
                    </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

              {activeTab === "transcription" && (
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">Loading transcript...</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">No transcript available</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 ${message.speaker === "ai" ? "justify-start" : "justify-end"}`}
                      >
                        {message.speaker === "ai" && (
                          <div className="flex flex-col items-start flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                              <span className="text-xs font-semibold text-white">AI</span>
                            </div>
                            <span className="text-xs font-medium text-gray-600 mt-1.5">{conversation.agent}</span>
                          </div>
                        )}

                        <div className={`flex flex-col ${message.speaker === "ai" ? "items-start" : "items-end"} max-w-[75%]`}>
                          <div className={`rounded-xl px-4 py-2.5 ${
                            message.speaker === "ai"
                              ? "bg-gray-100 text-gray-900"
                              : "bg-gray-900 text-white"
                          }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                          </div>
                          <div className={`flex items-center gap-2 mt-1.5 ${message.speaker === "user" ? "flex-row-reverse" : ""}`}>
                            <span className="text-xs text-gray-500">{message.timestamp}</span>
                            {message.ttsTime && (
                              <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                TTS {message.ttsTime}
                              </span>
                            )}
                            {message.asrTime && (
                              <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                ASR {message.asrTime}
                              </span>
                            )}
                          </div>
                        </div>

                        {message.speaker === "user" && (
                          <div className="flex flex-col items-end flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-semibold text-gray-600">U</span>
                            </div>
                          </div>
                        )}
                      </div>
                      ))
                    )}
                  </div>
                )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

