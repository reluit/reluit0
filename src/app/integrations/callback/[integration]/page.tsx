"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function IntegrationCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const integration = params.integration as string;
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // In a production app, this would:
        // 1. Exchange the authorization code for an access token
        // 2. Store the connection in the database
        // 3. Redirect to the integrations page with success

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        setStatus("success");
        setMessage(`Successfully connected to ${integration}!`);

        // Redirect to integrations page after 2 seconds
        setTimeout(() => {
          router.push("/dashboard/integrations?connected=" + integration);
        }, 2000);
      } catch (error: any) {
        console.error("Callback error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to connect integration");

        // Redirect to integrations page after 3 seconds
        setTimeout(() => {
          router.push("/dashboard/integrations?error=" + integration);
        }, 3000);
      }
    };

    handleCallback();
  }, [integration, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === "processing" && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          )}
          {status === "success" && (
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {status === "processing" && "Connecting your integration"}
          {status === "success" && "Connection successful!"}
          {status === "error" && "Connection failed"}
        </h2>

        <p className="text-sm text-gray-600">{message}</p>

        {status === "error" && (
          <button
            onClick={() => router.push("/dashboard/integrations")}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Integrations
          </button>
        )}
      </div>
    </div>
  );
}
