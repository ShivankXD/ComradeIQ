import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep heavy, native/dynamic-require server packages out of the bundle so
  // Vercel's file tracing includes them from node_modules at runtime instead of
  // mis-bundling them (which crashed the serverless functions at import time).
  serverExternalPackages: ["pdf-parse", "pptxgenjs", "ably", "@vercel/blob"],
};

export default nextConfig;
