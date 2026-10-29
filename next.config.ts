import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-only "N" badge covers the mobile bottom nav. Errors still show when this is off.
  devIndicators: false,
};

export default nextConfig;
