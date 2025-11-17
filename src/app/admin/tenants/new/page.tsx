"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Globe, Hash, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    domain: "",
    subdomain: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }

    // Auto-generate subdomain from slug
    if (name === "slug") {
      const subdomain = value.replace(/[^a-z0-9]+/g, "");
      setFormData((prev) => ({ ...prev, subdomain }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = "Slug can only contain lowercase letters, numbers, and hyphens";
    }

    if (formData.domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(formData.domain)) {
      newErrors.domain = "Invalid domain format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          domain: formData.domain,
          subdomain: formData.subdomain,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/admin/tenants");
      } else {
        // Handle specific error types
        if (data.error && data.error.includes("already exists")) {
          setErrors({ slug: data.error });
        } else {
          setErrors({ submit: data.error || "Failed to create tenant" });
        }
      }
    } catch (error) {
      setErrors({ submit: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-transition-wrapper">
      <div className="page-content" style={{ paddingLeft: '72px', paddingRight: '48px', paddingTop: '32px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl"
        >
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tenants
            </Link>
            <h1 className="text-[2rem] font-medium text-gray-900 mb-1">Create New Tenant</h1>
            <p className="text-sm text-gray-500">Set up a new tenant account with admin user</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="space-y-6">
              {/* Tenant Information */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Tenant Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Acme Corporation"
                      className={`w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                        errors.name ? "border-red-300" : "border-gray-200"
                      }`}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Hash className="w-4 h-4 inline mr-2" />
                      Slug *
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="acme-corp"
                      className={`w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                        errors.slug ? "border-red-300" : "border-gray-200"
                      }`}
                    />
                    <p className="mt-1 text-xs text-gray-500">URL: /{formData.slug}/dashboard</p>
                    {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="w-4 h-4 inline mr-2" />
                      Custom Domain (optional)
                    </label>
                    <input
                      type="text"
                      name="domain"
                      value={formData.domain}
                      onChange={handleInputChange}
                      placeholder="app.acme.com"
                      className={`w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                        errors.domain ? "border-red-300" : "border-gray-200"
                      }`}
                    />
                    <p className="mt-1 text-xs text-gray-500">Optional custom domain for this tenant</p>
                    {errors.domain && <p className="mt-1 text-sm text-red-600">{errors.domain}</p>}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Tenant"
                  )}
                </button>
                <Link
                  href="/admin/tenants"
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
