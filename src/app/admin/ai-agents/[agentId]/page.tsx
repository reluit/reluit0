"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save, Play, Settings, Database, Plus, X, Link as LinkIcon, FileText, Trash2 } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

interface Voice {
  voiceId: string;
  name: string;
  category?: string;
}

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
  model_id: string | null;
  knowledge_base_id: string | null;
  status: string;
  created_at: string;
  tenants?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ElevenLabsAgent {
  agentId: string;
  name: string;
  conversationConfig: {
    agent: {
      prompt: {
        prompt: string;
      };
      firstMessage: string;
      language: string;
    };
    tts: {
      voiceId: string;
      modelId?: string;
    };
  };
}

export default function ManageAIAgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [elevenLabsAgent, setElevenLabsAgent] = useState<ElevenLabsAgent | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<Array<{ knowledgeBaseId: string; name: string }>>([]);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const addDocumentMenuRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"configuration" | "knowledge-base">("configuration");
  const [documents, setDocuments] = useState<Array<{ 
    id: string; 
    name: string; 
    type: "url" | "file" | "text";
    metadata?: {
      created_at_unix_secs: number;
      last_updated_at_unix_secs: number;
      size_bytes: number;
    };
    url?: string;
  }>>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newUrlName, setNewUrlName] = useState("");
  const [showAddDocumentMenu, setShowAddDocumentMenu] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    prompt: "",
    firstMessage: "",
    voiceId: "",
    language: "en",
    modelId: "eleven_turbo_v2",
    status: "active",
    knowledgeBaseId: "",
  });

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
    if (agentId) {
      fetchAgent();
      fetchVoices();
      fetchKnowledgeBases();
    }
  }, [agentId]);

  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string>("");

  useEffect(() => {
    if (activeTab === "knowledge-base") {
      fetchDocuments();
    }
  }, [activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAddDocumentMenu && addDocumentMenuRef.current && !addDocumentMenuRef.current.contains(event.target as Node)) {
        setShowAddDocumentMenu(false);
      }
    };

    if (showAddDocumentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddDocumentMenu]);

  useEffect(() => {
    // Set default knowledge base to first one if available
    if (knowledgeBases.length > 0 && !selectedKnowledgeBaseId) {
      const firstKB = knowledgeBases[0].knowledgeBaseId;
      setSelectedKnowledgeBaseId(firstKB);
      setFormData({ ...formData, knowledgeBaseId: firstKB });
    }
  }, [knowledgeBases]);

  const fetchAgent = async () => {
    setLoading(true);

    try {
      console.log("Fetching agent with ID:", agentId);
      const response = await fetch(`/api/admin/ai-agents/${agentId}`);
      const data = await response.json();

      console.log("Agent fetch response:", { status: response.status, ok: response.ok, data });

      if (response.ok && data.agent) {
        setAgent(data.agent);
        setElevenLabsAgent(data.elevenLabsAgent || null);

        // Use ElevenLabs data if available, otherwise use database data
        const prompt = data.elevenLabsAgent?.conversationConfig?.agent?.prompt?.prompt || data.agent.system_prompt || "";
        const firstMessage = data.elevenLabsAgent?.conversationConfig?.agent?.firstMessage || data.agent.first_message || "";
        const voiceId = data.elevenLabsAgent?.conversationConfig?.tts?.voiceId || data.agent.voice_profile_id || "";
        const modelId = data.elevenLabsAgent?.conversationConfig?.tts?.modelId || data.agent.model_id || "eleven_turbo_v2";
        const language = data.elevenLabsAgent?.conversationConfig?.agent?.language || data.agent.language || "en";

        const kbId = data.agent.knowledge_base_id || "";
        setFormData({
          name: data.agent.name || "",
          prompt: prompt,
          firstMessage: firstMessage,
          voiceId: voiceId,
          language: language,
          modelId: modelId.replace("_v2_5", "_v2"), // Normalize model ID
          status: data.agent.status || "active",
          knowledgeBaseId: kbId,
        });
        // Set selected knowledge base if agent has one
        if (kbId) {
          setSelectedKnowledgeBaseId(kbId);
        }
      } else {
        console.error("Failed to fetch agent:", { status: response.status, error: data.error, details: data.details });
        alert(data.error || "Failed to fetch agent");
      }
    } catch (error) {
      console.error("Error fetching agent:", error);
      alert(`Error fetching agent: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoices = async () => {
    try {
      const response = await fetch("/api/admin/ai-agents/voices");
      const data = await response.json();

      if (response.ok) {
        setVoices(data.voices || []);
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
    }
  };

  const fetchKnowledgeBases = async () => {
    try {
      const response = await fetch("/api/admin/ai-agents/knowledge-bases");
      const data = await response.json();

      if (response.ok) {
        setKnowledgeBases(data.knowledgeBases || []);
      }
    } catch (error) {
      console.error("Error fetching knowledge bases:", error);
    }
  };

  const fetchDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const response = await fetch(`/api/admin/ai-agents/knowledge-bases/documents?page_size=100`);
      const data = await response.json();

      if (response.ok) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);
      formDataToSend.append("name", file.name);
      formDataToSend.append("agentId", agentId as string);

      const response = await fetch(`/api/admin/ai-agents/knowledge-bases/documents/file`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        e.target.value = ""; // Reset input
        await fetchDocuments(); // Refresh documents list
      } else {
        alert(data.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!newUrl) return;

    setUploading(true);
    try {
      const response = await fetch(`/api/admin/ai-agents/knowledge-bases/documents/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: newUrl,
          name: newUrlName || undefined,
          agentId: agentId as string,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchDocuments();
        setNewUrl("");
        setNewUrlName("");
        setShowAddUrl(false);
      } else {
        alert(data.error || "Failed to add URL");
      }
    } catch (error) {
      console.error("Error adding URL:", error);
      alert("Failed to add URL");
    } finally {
      setUploading(false);
    }
  };



  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/ai-agents/${agentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          knowledgeBaseId: selectedKnowledgeBaseId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAgent(data.agent);
        alert("Agent updated successfully");
        fetchAgent(); // Refresh data
      } else {
        alert(data.error || "Failed to update agent");
      }
    } catch (error) {
      console.error("Error updating agent:", error);
      alert("Error updating agent");
    } finally {
      setSaving(false);
    }
  };

  const handleDemo = () => {
    if (!agent?.elevenlabs_agent_id) {
      alert("Agent does not have an ElevenLabs agent ID. Please ensure the agent is properly configured.");
      return;
    }
    // Open ElevenLabs demo page in a new tab
    window.open(`https://elevenlabs.io/app/talk-to?agent_id=${agent.elevenlabs_agent_id}`, '_blank');
  };

  if (loading) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Loading agent...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Agent not found
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
      <div className="flex items-center gap-4">
              <motion.button
          onClick={() => router.push("/admin/ai-agents")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
        >
                <ArrowLeft className="h-3 w-3" />
                Back
              </motion.button>
        <div>
                <h1 className="text-[1.625rem] font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {agent.name}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  {agent.tenants?.name || "Unknown Tenant"} • {agent.status}
          </p>
        </div>
      </div>
            <motion.button
              onClick={handleDemo}
              disabled={!agent.elevenlabs_agent_id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Demo Agent
            </motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
          <button
            onClick={() => setActiveTab("configuration")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "configuration"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </div>
          </button>
          <button
            onClick={() => setActiveTab("knowledge-base")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "knowledge-base"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
          >
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Knowledge Base
            </div>
          </button>
        </div>

        {/* Configuration Form */}
        {activeTab === "configuration" && (
        <form onSubmit={handleSubmit} className="space-y-6" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Agent Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[5px] bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                System Prompt
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={6}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[5px] bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all resize-none"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                First Message
              </label>
              <input
                type="text"
                value={formData.firstMessage}
                onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[5px] bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              />
      </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Voice
                </label>
                <Dropdown
                  value={formData.voiceId}
                  onChange={(value) => setFormData({ ...formData, voiceId: value })}
                  options={[
                    { value: "", label: "Select a voice" },
                    ...voices.map((voice) => ({
                      value: voice.voiceId,
                      label: `${voice.name}${voice.category ? ` (${voice.category})` : ""}`,
                    })),
                  ]}
                  placeholder="Select a voice"
                  size="md"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Language
                </label>
                <Dropdown
                  value={formData.language}
                  onChange={(value) => setFormData({ ...formData, language: value })}
                  options={[
                    { value: "en", label: "English" },
                    { value: "es", label: "Spanish" },
                    { value: "fr", label: "French" },
                    { value: "de", label: "German" },
                    { value: "it", label: "Italian" },
                    { value: "pt", label: "Portuguese" },
                  ]}
                  size="md"
                />
              </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Model
                </label>
                <Dropdown
                  value={formData.modelId}
                  onChange={(value) => setFormData({ ...formData, modelId: value })}
                  options={
                    formData.language === "en"
                      ? [
                          { value: "eleven_turbo_v2", label: "Turbo v2 (Fast)" },
                          { value: "eleven_flash_v2", label: "Flash v2 (Ultra Fast)" },
                        ]
                      : [{ value: "eleven_multilingual_v2", label: "Multilingual v2 (High Quality)" }]
                  }
                  size="md"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  Status
                </label>
                <Dropdown
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value })}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "testing", label: "Testing" },
                  ]}
                  size="md"
                />
              </div>
              </div>


            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-semibold text-gray-600 uppercase">Status:</span>{" "}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium ${
                    agent.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : agent.status === "testing"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-600 uppercase">Type:</span> {agent.agent_type}
                </div>
                {agent.tenants && (
                  <div>
                    <span className="font-semibold text-gray-600 uppercase">Tenant:</span> {agent.tenants.name}
                  </div>
                )}
              </div>
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Save Changes
              </motion.button>
              </div>
              </div>
            </form>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === "knowledge-base" && (
          <div className="space-y-6" style={{ width: tableWidth ? `${tableWidth}px` : 'auto' }}>
            {/* Documents Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Documents
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Add documents to your knowledge base
                  </p>
                </div>
                <div className="relative" ref={addDocumentMenuRef}>
                  <motion.button
                    onClick={() => {
                      setShowAddDocumentMenu(!showAddDocumentMenu);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Document
                  </motion.button>
                  {showAddDocumentMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
                      <button
                        onClick={() => {
                          setShowAddUrl(true);
                          setShowAddDocumentMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                      >
                        <LinkIcon className="h-4 w-4" />
                        From URL
                      </button>
                      <label className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer block">
                        <FileText className="h-4 w-4" />
                        From File
                        <input
                          type="file"
                          onChange={(e) => {
                            handleFileUpload(e);
                            setShowAddDocumentMenu(false);
                          }}
                          disabled={uploading}
                          className="hidden"
                          accept=".pdf,.docx,.doc,.txt,.md"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {showAddUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-gray-200 rounded-lg bg-white space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                        Add URL
                      </h3>
                      <button
                        onClick={() => {
                          setShowAddUrl(false);
                          setNewUrl("");
                          setNewUrlName("");
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Document name"
                        value={newUrlName}
                        onChange={(e) => setNewUrlName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[5px] bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                      />
                      <input
                        type="url"
                        placeholder="https://example.com"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[5px] bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddUrl(false);
                            setNewUrl("");
                            setNewUrlName("");
                          }}
                          className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                        >
                          Cancel
                        </button>
                        <motion.button
                          type="button"
                          onClick={handleAddUrl}
                          disabled={!newUrl || !newUrlName || uploading}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                        >
                          {uploading ? "Adding..." : "Add URL"}
                        </motion.button>
            </div>
            </div>
                  </motion.div>
              )}

              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 border border-gray-200 rounded-lg bg-gray-50 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    No documents yet. Add URLs, files, or text to get started.
                  </p>
                </div>
              ) : (
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
                            Size
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
                        {documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 border-b border-gray-200">
                              <div className="flex items-center gap-2">
                                {doc.type === "url" && <LinkIcon className="h-4 w-4 text-gray-400" strokeWidth={1.5} />}
                                {doc.type === "file" && <FileText className="h-4 w-4 text-gray-400" strokeWidth={1.5} />}
                                {doc.type === "text" && <FileText className="h-4 w-4 text-gray-400" strokeWidth={1.5} />}
                                <span className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                  {doc.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                {doc.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                              <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                {doc.metadata?.size_bytes ? formatBytes(doc.metadata.size_bytes) : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                              <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                                {doc.metadata?.created_at_unix_secs ? new Date(doc.metadata.created_at_unix_secs * 1000).toLocaleDateString() : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm("Are you sure you want to delete this document?")) {
                                      try {
                                        const response = await fetch(
                                          `/api/admin/ai-agents/knowledge-bases/documents/${doc.id}`,
                                          {
                                            method: "DELETE",
                                          }
                                        );

                                        const data = await response.json();

                                        if (response.ok) {
                                          await fetchDocuments(); // Refresh documents list
                                        } else {
                                          alert(data.error || "Failed to delete document");
                                        }
                                      } catch (error) {
                                        console.error("Error deleting document:", error);
                                        alert("Failed to delete document");
                                      }
                                    }
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
            )}

        <div className="pb-8"></div>
      </div>

    </div>
  );
}
