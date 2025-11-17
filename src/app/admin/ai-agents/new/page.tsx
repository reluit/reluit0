"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Voice {
  voiceId: string;
  name: string;
  category?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface KnowledgeBase {
  knowledgeBaseId: string;
  name: string;
  description?: string;
}

export default function NewAIAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [knowledgeBasesLoading, setKnowledgeBasesLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);

  const [formData, setFormData] = useState({
    tenantId: "",
    name: "",
    prompt: "",
    firstMessage: "",
    voiceId: "",
    language: "en",
    modelId: "eleven_turbo_v2",
    knowledgeBaseId: "",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    fetchVoices();
    fetchTenants();
    fetchKnowledgeBases();
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await fetch("/api/admin/ai-agents/voices");
      const data = await response.json();

      if (response.ok) {
        setVoices(data.voices || []);
      } else {
        console.error("Failed to fetch voices:", data.error);
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
    } finally {
      setVoicesLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants");
      const data = await response.json();

      if (response.ok) {
        setTenants(Array.isArray(data) ? data : data.tenants || []);
      } else {
        console.error("Failed to fetch tenants:", data.error);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setTenantsLoading(false);
    }
  };

  const fetchKnowledgeBases = async () => {
    try {
      const response = await fetch("/api/admin/ai-agents/knowledge-bases");
      const data = await response.json();

      if (response.ok) {
        setKnowledgeBases(data.knowledgeBases || []);
      } else {
        console.error("Failed to fetch knowledge bases:", data.error);
      }
    } catch (error) {
      console.error("Error fetching knowledge bases:", error);
    } finally {
      setKnowledgeBasesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.tenantId || !formData.name || !formData.prompt || !formData.firstMessage || !formData.voiceId) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        knowledgeBaseId: formData.knowledgeBaseId || undefined,
      };
      const response = await fetch("/api/admin/ai-agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/admin/ai-agents");
      } else {
        alert(data.error || "Failed to create agent");
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      alert("Error creating agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
      <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <motion.button
          onClick={() => router.push("/admin/ai-agents")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
        >
              <ArrowLeft className="h-4 w-4" />
          Back
            </motion.button>
        <div>
              <h1 className="text-[1.625rem] font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Create AI Agent
              </h1>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            Set up a new conversational AI agent with ElevenLabs
          </p>
            </div>
        </div>
      </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Tenant */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Tenant *
            </label>
              <Select
                value={formData.tenantId}
              onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
              >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tenantsLoading ? "Loading tenants..." : "Select a tenant"} />
                </SelectTrigger>
                <SelectContent>
                  {tenantsLoading ? (
                  <SelectItem value="">Loading...</SelectItem>
                  ) : tenants.length === 0 ? (
                  <SelectItem value="">No tenants found</SelectItem>
                  ) : (
                    tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.slug})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

          {/* Agent Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Agent Name *
            </label>
            <input
              type="text"
                value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Customer Support Agent"
                required
              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              />
            </div>

          {/* System Prompt */}
          <div>
            <div className="mb-2">
              <label className="block text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                System Prompt *
              </label>
              <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Define how your agent should behave and respond to customers
              </p>
            </div>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="You are a helpful customer support agent. Be polite, professional, and eager to assist customers with their inquiries."
              rows={5}
                required
              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all resize-none"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              />
          </div>

          {/* First Message */}
          <div>
            <div className="mb-2">
              <label className="block text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                First Message *
              </label>
              <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                The initial greeting your agent will use
              </p>
            </div>
            <input
              type="text"
              value={formData.firstMessage}
              onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
              placeholder="Hello! How can I help you today?"
              required
              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            />
            </div>

          {/* Voice */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Voice *
            </label>
              <Select
                value={formData.voiceId}
              onValueChange={(value) => setFormData({ ...formData, voiceId: value })}
              >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={voicesLoading ? "Loading voices..." : "Select a voice"} />
                </SelectTrigger>
                <SelectContent>
                  {voicesLoading ? (
                  <SelectItem value="">Loading...</SelectItem>
                  ) : voices.length === 0 ? (
                  <SelectItem value="">No voices available</SelectItem>
                  ) : (
                    voices.map((voice) => (
                      <SelectItem key={voice.voiceId} value={voice.voiceId}>
                        {voice.name}
                      {voice.category && ` (${voice.category})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

          {/* Language and Model */}
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Language
              </label>
                <Select
                  value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Model
              </label>
                <Select
                  value={formData.modelId}
                onValueChange={(value) => setFormData({ ...formData, modelId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="eleven_turbo_v2">Turbo v2 (Fast, Recommended for English)</SelectItem>
                  <SelectItem value="eleven_flash_v2">Flash v2 (Ultra Fast, Recommended for English)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          {/* Knowledge Base */}
          <div>
            <div className="mb-2">
              <label className="block text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Knowledge Base (Optional)
              </label>
              <p className="text-xs text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Connect a knowledge base to provide your agent with additional context and information
              </p>
            </div>
            <Select
              value={formData.knowledgeBaseId || "none"}
              onValueChange={(value) => setFormData({ ...formData, knowledgeBaseId: value === "none" ? "" : value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={knowledgeBasesLoading ? "Loading knowledge bases..." : "Select a knowledge base (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {knowledgeBasesLoading ? (
                  <SelectItem value="">Loading...</SelectItem>
                ) : knowledgeBases.length === 0 ? (
                  <SelectItem value="">No knowledge bases available</SelectItem>
                ) : (
                  knowledgeBases.map((kb) => (
                    <SelectItem key={kb.knowledgeBaseId} value={kb.knowledgeBaseId}>
                      {kb.name}
                      {kb.description && ` - ${kb.description}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <motion.button
                type="button"
                onClick={() => router.push("/admin/ai-agents")}
              disabled={loading || tenantsLoading || voicesLoading || knowledgeBasesLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              >
                Cancel
            </motion.button>
            <motion.button
                type="submit"
              disabled={loading || tenantsLoading || voicesLoading || knowledgeBasesLoading || tenants.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
              >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Agent
            </motion.button>
            </div>
          </form>

        <div className="pb-8"></div>
      </div>
    </div>
  );
}
