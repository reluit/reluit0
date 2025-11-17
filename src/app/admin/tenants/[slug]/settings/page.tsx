"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Save, Globe, Shield, Trash2, AlertTriangle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [settings, setSettings] = useState({
    businessName: "",
    slug: slug || "",
    primaryDomain: "",
    redirectUrl: "",
    allowRegistration: true,
    enableAnalytics: true,
    enableNotifications: true,
  });

  useEffect(() => {
    fetchSettings();
  }, [slug]);

  const fetchSettings = async () => {
    if (!slug) return;
    try {
      setFetching(true);
      const response = await fetch(`/api/admin/clients/${slug}/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!slug) return;
    setLoading(true);
    setSaveSuccess(false);
    try {
      const response = await fetch(`/api/admin/clients/${slug}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      alert("Client deletion not implemented yet");
    }
  };

  return (
    <div className="space-y-8">
      {/* General Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
            <p className="text-sm text-gray-500">Basic client information and branding</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Slug
              </label>
              <input
                type="text"
                value={settings.slug}
                onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Domain
              </label>
              <input
                type="text"
                value={settings.primaryDomain}
                onChange={(e) => setSettings({ ...settings, primaryDomain: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom domain for the client's dashboard
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redirect URL
              </label>
              <input
                type="text"
                value={settings.redirectUrl}
                onChange={(e) => setSettings({ ...settings, redirectUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Where users are redirected after authentication
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Feature Flags</h3>
            <p className="text-sm text-gray-500">Enable or disable client features</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Allow Self Registration</p>
              <p className="text-xs text-gray-500">Let users create their own accounts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Analytics</p>
              <p className="text-xs text-gray-500">Track call metrics and performance</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableAnalytics}
                onChange={(e) => setSettings({ ...settings, enableAnalytics: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Notifications</p>
              <p className="text-xs text-gray-500">Send email and SMS notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Danger Zone</h3>
            <p className="text-sm text-gray-500">Irreversible and destructive actions</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Trash2 className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Delete Client</h4>
              <p className="text-sm text-red-700 mb-4">
                Permanently delete this client and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end items-center gap-3">
        {saveSuccess && (
          <span className="text-sm text-emerald-600">Settings saved successfully!</span>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
