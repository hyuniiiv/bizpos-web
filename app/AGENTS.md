<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# app (Next.js App Router)

## Purpose
Next.js App Router 기반의 페이지 및 API 라우트 디렉토리입니다.
로그인, POS 단말기, 관리자(Admin), 대시보드의 4개 주요 영역으로 구성됩니다.
서버 컴포넌트 기본 원칙을 따르며 클라이언트 인터랙션이 필요한 경우만 `'use client'` 사용합니다.

## Key Files

| File | Description |
|------|-------------|
| `layout.tsx` | 루트 레이아웃 (전체 앱 공통 레이아웃) |
| `page.tsx` | 홈 페이지 (루트 라우트) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `login/` | 로그인 페이지 |
| `pos/` | POS 단말기 운영 페이지 (see `pos/AGENTS.md`) |
| `admin/` | 매장 관리자 페이지 (see `admin/AGENTS.md`) |
| `dashboard/` | 본사 대시보드 페이지 (see `dashboard/AGENTS.md`) |
| `api/` | Next.js API 라우트 (see `api/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 새 페이지 추가: `app/{route}/page.tsx` 형식
- 공유 레이아웃: `app/{section}/layout.tsx`
- 로딩 상태: `loading.tsx` 파일 추가
- 에러 처리: `error.tsx` 파일 추가
- 인증이 필요한 라우트: `middleware.ts`의 protected routes 목록에 추가

### Route Structure
| Route | Description |
|-------|-------------|
| `/` | 홈 (대시보드 또는 로그인으로 리다이렉트) |
| `/login` | Supabase 기반 로그인 |
| `/pos` | POS 단말기 메인 화면 |
| `/pos/admin` | POS 단말기 관리 설정 |
| `/admin` | 매장 관리자 메인 |
| `/admin/count` | 재고 카운트 관리 |
| `/admin/device` | 디바이스 관리 |
| `/admin/menus` | 메뉴 관리 |
| `/admin/transactions` | 거래 내역 |
| `/dashboard` | 본사 대시보드 |
| `/dashboard/alerts` | 이상 감지 알림 |
| `/dashboard/analytics` | 매출 분석 |
| `/dashboard/keys` | 가맹점 키 관리 |
| `/dashboard/settings` | 설정 |
| `/dashboard/terminals` | 단말기 관리 |
| `/dashboard/transactions` | 전체 거래 내역 |

### Testing Requirements
- 각 페이지 라우트 접근 시 인증 리다이렉트 확인
- API 라우트는 `app/api/AGENTS.md` 참조

### Common Patterns
- 서버 컴포넌트에서 Supabase 서버 클라이언트 사용: `lib/supabase/server.ts`
- 클라이언트 컴포넌트에서: `lib/supabase/client.ts`
- 대형 클라이언트 로직은 `components/` 로 분리 (예: `DashboardClient.tsx`)

## Dependencies

### Internal
- `lib/supabase/server.ts` - 서버 사이드 DB 접근
- `middleware.ts` - 인증 보호
- `components/` - UI 컴포넌트

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
