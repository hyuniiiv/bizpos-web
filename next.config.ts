import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Electron 프로덕션 빌드용 standalone 출력
  output: 'standalone',
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
