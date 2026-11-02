import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optional separate build/dev output directory (lets a second dev server or a build run beside a live one).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
