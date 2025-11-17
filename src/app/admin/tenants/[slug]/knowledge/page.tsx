"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Upload, FileText, Search, Trash2, Download, Plus, Loader2 } from "lucide-react";

interface Document {
  id: string;
  name: string;
  file_type?: string;
  file_size?: number;
  chunks?: number;
  created_at?: string;
  uploadedAt?: string;
  type?: string;
  size?: string;
}

export default function KnowledgeBasePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [slug]);

  const fetchDocuments = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clients/${slug}/knowledge`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,.doc,.txt,.md";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !slug) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);

        const response = await fetch(`/api/admin/clients/${slug}/knowledge`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          await fetchDocuments();
        } else {
          const data = await response.json();
          alert(data.error || "Failed to upload document");
        }
      } catch (error) {
        console.error("Error uploading document:", error);
        alert("Failed to upload document");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    if (!slug) return;

    try {
      const response = await fetch(`/api/admin/clients/${slug}/knowledge?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Knowledge Base</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage documents and resources your AI agent can access
            </p>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Upload Document
              </>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : documents.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Upload className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Chunks</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : documents.reduce((sum, doc) => sum + (doc.chunks || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Search className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Last Updated</p>
              <p className="text-2xl font-semibold text-gray-900">Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Documents ({filteredDocs.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              {searchQuery ? "No documents found" : "No documents uploaded yet"}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {searchQuery ? "Try a different search term" : "Upload your first document to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                Upload Document
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{doc.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{doc.file_type || doc.type || "UNKNOWN"}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{doc.chunks || 0} chunks</span>
                        <span>•</span>
                        <span>Uploaded {formatDate(doc.created_at || doc.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Guide */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Supported Formats</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload PDF, DOCX, TXT, or Markdown files to build your knowledge base
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
            PDF
          </span>
          <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
            DOCX
          </span>
          <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
            TXT
          </span>
          <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
            MD
          </span>
        </div>
      </div>
    </div>
  );
}
