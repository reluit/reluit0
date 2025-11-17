import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable trailing slash redirects to prevent 307 errors for webhook calls
  // This ensures /api/composio/execute/ and /api/composio/execute both work
  trailingSlash: false,
  // Ensure API routes don't get redirected
  async redirects() {
    return [];
  },
};

export default nextConfig;

