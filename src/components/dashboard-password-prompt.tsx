"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardPasswordPromptProps {
  slug: string;
  onAuthenticated: () => void;
}

export function DashboardPasswordPrompt({ slug, onAuthenticated }: DashboardPasswordPromptProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/dashboard/auth/check");
      const data = await response.json();
      
      if (data.authenticated) {
        onAuthenticated();
      } else {
        setIsChecking(false);
      }
    } catch (err) {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onAuthenticated();
      } else {
        // Check if error is due to email not being confirmed
        const errorMessage = data.message || "Invalid password";
        const isEmailNotConfirmed = 
          errorMessage.toLowerCase().includes("email") && 
          (errorMessage.toLowerCase().includes("confirm") || 
           errorMessage.toLowerCase().includes("verified") ||
           errorMessage.toLowerCase().includes("verification"));
        
        if (isEmailNotConfirmed) {
          setEmailNotConfirmed(true);
          setError("");
        } else {
          setEmailNotConfirmed(false);
          setError(errorMessage);
        }
      }
    } catch (err) {
      setError("Failed to authenticate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendSuccess(false);
    setError("");

    try {
      const response = await fetch("/api/dashboard/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResendSuccess(true);
        setEmailNotConfirmed(false);
      } else {
        setError(data.message || "Failed to resend verification email");
      }
    } catch (err) {
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setResendingEmail(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-gray-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Dashboard Access
            </h1>
            <p className="text-sm text-gray-600 text-center">
              Please enter your password to access the dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && !emailNotConfirmed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </motion.div>
            )}

            {emailNotConfirmed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Email not confirmed</p>
                    <p className="text-xs mt-1 text-amber-700">
                      Please check your email and click the verification link to confirm your account.
                    </p>
                  </div>
                </div>
                {resendSuccess ? (
                  <div className="mt-2 p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    Verification email sent! Please check your inbox.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="mt-2 w-full px-3 py-2 text-xs font-medium text-amber-900 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resendingEmail ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3" />
                        <span>Resend verification link</span>
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

