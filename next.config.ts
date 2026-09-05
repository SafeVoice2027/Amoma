import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1MB — a single evidence photo/video attached to a student
    // report routinely exceeds that, and Server Actions reject the whole
    // request outright when it does (surfacing to the browser as a hard
    // navigation failure, "This page couldn't load", not an in-app error).
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
