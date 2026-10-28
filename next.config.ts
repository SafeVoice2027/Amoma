import type { NextConfig } from "next";

// One id per build. Netlify provides COMMIT_REF (the commit) and DEPLOY_ID; a
// local build falls back to a timestamp. It's baked into both the browser and
// server bundles (NEXT_PUBLIC_BUILD_ID), and /api/version returns the *server's*
// copy — so an app open in a browser can tell when a newer deploy is live (see
// components/app-updater.tsx).
const BUILD_ID = process.env.COMMIT_REF || process.env.DEPLOY_ID || `local-${Date.now()}`;

const nextConfig: NextConfig = {
  generateBuildId: async () => BUILD_ID,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  experimental: {
    // Default is 1MB — a single evidence photo/video attached to a student
    // report routinely exceeds that, and Server Actions reject the whole
    // request outright when it does (surfacing to the browser as a hard
    // navigation failure, "This page couldn't load", not an in-app error).
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        // The service worker script must never be served from a cache, or a
        // browser can keep running an old copy long after a new deploy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
