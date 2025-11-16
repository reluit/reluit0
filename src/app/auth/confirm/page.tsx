"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

function ConfirmContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [tenantDomain, setTenantDomain] = useState<string | null>(null);

  useEffect(() => {
    handleConfirmation();
  }, []);

  const handleConfirmation = async () => {
    try {
      // Get the hash from URL (contains access_token, refresh_token)
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setStatus("error");
        setMessage("Invalid confirmation link");
        return;
      }

      // Exchange tokens for session
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
      });

      if (!response.ok) {
        setStatus("error");
        setMessage("Failed to confirm email");
        return;
      }

      // Get tenant information
      const tenantResponse = await fetch("/api/auth/tenant");
      const tenantData = await tenantResponse.json();

      if (tenantResponse.ok && tenantData.tenantDomain) {
        setTenantDomain(tenantData.tenantDomain);
        setStatus("success");
        setMessage("Your email has been confirmed!");
      } else {
        setStatus("error");
        setMessage("Failed to get tenant information");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred during confirmation");
    }
  };

  const handleGoToDashboard = () => {
    if (tenantDomain) {
      window.location.href = `https://${tenantDomain}`;
    } else {
      router.push("/");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="mt-4 text-sm text-gray-600">Confirming your email...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">You&apos;re all set!</h1>
            <p className="text-sm text-gray-600">
              {message}
            </p>
            {tenantDomain && (
              <p className="text-xs text-gray-500">
                Redirecting you to your dashboard...
              </p>
            )}
          </div>

          <div className="pt-4">
            <button
              onClick={handleGoToDashboard}
              className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Confirmation Failed</h1>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return <ConfirmContent />;
}

