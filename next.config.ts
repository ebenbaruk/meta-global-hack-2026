import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets several dev servers run side by side without clobbering each other's build output.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
