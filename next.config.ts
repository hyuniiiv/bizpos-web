import type { NextConfig } from "next";

const isElectron = process.env.BUILD_TARGET === 'electron';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Electron: static export (서버 불필요)
  // Vercel: SSR 유지 (undefined)
  output: isElectron ? 'export' : undefined,
  // Static export 시 이미지 최적화 불가
  images: isElectron ? { unoptimized: true } : undefined,
  // file:// 프로토콜에서 경로 정상 해석
  trailingSlash: isElectron,
  // Static export 시 API routes는 빌드에서 자동 제외됨
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
