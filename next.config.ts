import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Electron 빌드 시에만 standalone (오프라인 fallback용)
  // Vercel 배포 시에는 BUILD_TARGET 미설정 → undefined
  output: process.env.BUILD_TARGET === 'electron' ? 'standalone' : undefined,
  // CI와 로컬의 standalone 구조 통일.
  // 미지정 시 상위 lockfile 감지 여부에 따라 .next/standalone/<pkg>/ 서브폴더 또는 flat 구조로 갈림.
  // 프로젝트 루트를 고정해 항상 flat 구조 + node_modules 포함을 보장.
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
