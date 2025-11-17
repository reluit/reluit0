"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Bell, Shield, Database, Save } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "notifications" | "security" | "billing">("general");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    general: {
      siteName: "ReLuit",
      siteUrl: "https://reluit.com",
      adminEmail: "admin@reluit.com",
      defaultTimezone: "UTC",
      defaultLanguage: "en",
    },
    notifications: {
      emailAlerts: true,
      newTenantNotification: true,
      paymentFailureNotification: true,
      weeklyReports: true,
      webhookFailures: true,
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 24,
      passwordMinLength: 8,
      allowRegistration: true,
      requireEmailVerification: true,
    },
    billing: {
      autoCharge: true,
      lateFeeEnabled: false,
      lateFeeAmount: 0,
      dunningAttempts: 3,
      invoiceDaysUntilDue: 30,
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content" style={{ paddingLeft: '0px', paddingTop: '0px' }}>
      <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 className="text-[1.625rem] font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Settings
              </h1>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Manage your platform configuration and preferences
              </p>
            </div>
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Changes"}
            </motion.button>
          </div>
        </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
          <div className="lg:col-span-1">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("general")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "general"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                <SettingsIcon className="w-4 h-4" />
                  General
                </button>
                <button
                  onClick={() => setActiveTab("notifications")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "notifications"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                <Bell className="w-4 h-4" />
                  Notifications
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "security"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                <Shield className="w-4 h-4" />
                  Security
                </button>
                <button
                  onClick={() => setActiveTab("billing")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "billing"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                <Database className="w-4 h-4" />
                  Billing
                </button>
              </nav>
          </div>

            {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                {activeTab === "general" && (
                  <div className="space-y-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    General Settings
                  </h2>

                    <div className="space-y-4">
                      <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Site Name
                        </label>
                        <input
                          type="text"
                          value={settings.general.siteName}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: { ...settings.general, siteName: e.target.value },
                            })
                          }
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                        />
                      </div>

                      <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Site URL
                        </label>
                        <input
                          type="url"
                          value={settings.general.siteUrl}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: { ...settings.general, siteUrl: e.target.value },
                            })
                          }
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                        />
                      </div>

                      <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Admin Email
                        </label>
                        <input
                          type="email"
                          value={settings.general.adminEmail}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: { ...settings.general, adminEmail: e.target.value },
                            })
                          }
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                        />
                      </div>

                      <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Default Timezone
                        </label>
                        <Dropdown
                          value={settings.general.defaultTimezone}
                          onChange={(value) =>
                            setSettings({
                              ...settings,
                              general: { ...settings.general, defaultTimezone: value },
                            })
                          }
                          options={[
                            { value: "UTC", label: "UTC" },
                            { value: "America/New_York", label: "Eastern Time" },
                            { value: "America/Chicago", label: "Central Time" },
                            { value: "America/Denver", label: "Mountain Time" },
                            { value: "America/Los_Angeles", label: "Pacific Time" },
                          ]}
                          size="md"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="space-y-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Notification Settings
                  </h2>

                    <div className="space-y-4">
                    {Object.entries(settings.notifications).map(([key, value]) => (
                      <label key={key} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            {key === 'emailAlerts' && 'Receive email notifications for important events'}
                            {key === 'newTenantNotification' && 'Get notified when a new tenant signs up'}
                            {key === 'paymentFailureNotification' && 'Alert for failed payment attempts'}
                            {key === 'weeklyReports' && 'Receive weekly analytics reports'}
                            {key === 'webhookFailures' && 'Get notified of webhook delivery failures'}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={value as boolean}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, [key]: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                        />
                      </label>
                    ))}
                    </div>
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Security Settings
                  </h2>

                    <div className="space-y-4">
                    <label className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                        <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Two-Factor Authentication
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Require 2FA for admin accounts
                        </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.twoFactorAuth}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              security: { ...settings.security, twoFactorAuth: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                        />
                      </label>

                      <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Session Timeout (hours)
                        </label>
                        <input
                          type="number"
                          value={settings.security.sessionTimeout}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              security: { ...settings.security, sessionTimeout: parseInt(e.target.value) },
                            })
                          }
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                        />
                      </div>

                      <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Minimum Password Length
                        </label>
                        <input
                          type="number"
                          value={settings.security.passwordMinLength}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              security: { ...settings.security, passwordMinLength: parseInt(e.target.value) },
                            })
                          }
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                        />
                      </div>

                    <label className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                        <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Allow Registration
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Allow new tenant registration
                        </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.allowRegistration}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              security: { ...settings.security, allowRegistration: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === "billing" && (
                  <div className="space-y-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    Billing Settings
                  </h2>

                    <div className="space-y-4">
                    <label className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                        <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Automatic Charging
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Automatically charge subscription fees
                        </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.billing.autoCharge}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              billing: { ...settings.billing, autoCharge: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                        />
                      </label>

                    <label className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                        <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Late Fees
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Charge late fees for overdue invoices
                        </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.billing.lateFeeEnabled}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              billing: { ...settings.billing, lateFeeEnabled: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                        />
                      </label>

                      {settings.billing.lateFeeEnabled && (
                        <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            Late Fee Amount (cents)
                          </label>
                          <input
                            type="number"
                            value={settings.billing.lateFeeAmount}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                billing: { ...settings.billing, lateFeeAmount: parseInt(e.target.value) },
                              })
                            }
                          className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </div>
                      )}

                      <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                          Invoice Payment Terms (days)
                        </label>
                        <input
                          type="number"
                          value={settings.billing.invoiceDaysUntilDue}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              billing: { ...settings.billing, invoiceDaysUntilDue: parseInt(e.target.value) },
                            })
                          }
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300 transition-all"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>

        <div className="pb-8"></div>
      </div>
    </div>
  );
}
