<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# bizpos-web

## Purpose
BIZPOS의 메인 Next.js 애플리케이션입니다. POS 단말기 운영, 결제 처리, 관리자 대시보드,
매장 분석을 포함하는 풀스택 웹앱이며 Electron으로 데스크톱 앱으로도 패키징됩니다.
App Router 기반의 Next.js 15를 사용하며 Supabase를 백엔드로 활용합니다.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | 프로젝트 의존성 및 스크립트 |
| `tsconfig.json` | TypeScript 설정 |
| `next.config.ts` | Next.js 빌드 설정 |
| `next-env.d.ts` | Next.js TypeScript 환경 타입 |
| `middleware.ts` | 인증 미들웨어 (라우트 보호) |
| `components.json` | shadcn/ui 컴포넌트 설정 |
| `.bkit-memory.json` | bkit 에이전트 메모리 (레거시 위치) |
| `README.md` | 프로젝트 설명 문서 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router - 페이지 및 API 라우트 (see `app/AGENTS.md`) |
| `components/` | 재사용 가능한 React 컴포넌트 (see `components/AGENTS.md`) |
| `lib/` | 비즈니스 로직 및 유틸리티 (see `lib/AGENTS.md`) |
| `types/` | TypeScript 타입 정의 (see `types/AGENTS.md`) |
| `supabase/` | DB 마이그레이션 및 스키마 (see `supabase/AGENTS.md`) |
| `data/` | 로컬 JSON 데이터 파일 |
| `public/` | 정적 파일 (사운드, 이미지 등) |
| `docs/` | 피처별 PDCA 문서 (see `docs/AGENTS.md`) |
| `electron/` | Electron 데스크톱 앱 설정 |
| `resources/` | 앱 리소스 파일 |

## For AI Agents

### Working In This Directory
- 새 페이지 추가: `app/` 내 App Router 구조 따를 것
- 새 컴포넌트: `components/` 에 추가, `components/ui/`는 shadcn/ui 전용
- 비즈니스 로직: `lib/` 하위 도메인별 디렉토리에 배치
- 환경 변수: `.env.local` 사용 (`.env.example` 참조)

### Testing Requirements
- `npm run dev` 또는 `pnpm dev`로 개발 서버 시작
- Zero Script QA: API 응답을 로그로 검증
- Supabase 연결: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 필요

### Common Patterns
- 서버 컴포넌트 기본, 클라이언트 인터랙션 필요 시 `'use client'` 추가
- API 라우트: `app/api/[domain]/route.ts` 구조
- 인증: `middleware.ts`에서 Supabase 세션 기반 보호
- 상태 관리: Zustand store (`lib/store/`)
- 에러 처리: `lib/api/error.ts` 유틸리티 사용

## Dependencies

### Internal
- 루트 `AGENTS.md` 참조

### External
- `next` 15.x - React 풀스택 프레임워크
- `@supabase/supabase-js` - Supabase 클라이언트
- `zustand` - 상태 관리
- `shadcn/ui` + `radix-ui` - UI 컴포넌트
- `recharts` - 차트 시각화
- `electron` - 데스크톱 래퍼

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
