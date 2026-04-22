import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Electron 빌드 시에만 standalone (오프라인 fallback용)
  // Vercel 배포 시에는 BUILD_TARGET 미설정 → undefined
  output: process.env.BUILD_TARGET === 'electron' ? 'standalone' : undefined,
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
