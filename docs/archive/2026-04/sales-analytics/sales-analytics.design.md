# [Design] sales-analytics

> **Summary**: 메뉴별·기간별·단말기별 매출 분석 차트 대시보드
>
> **Project**: BIZPOS Web
> **Date**: 2026-03-24
> **Status**: Draft
> **Planning Doc**: [sales-analytics.plan.md](../../01-plan/features/sales-analytics.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- Supabase `transactions` 테이블 집계 쿼리로 서버에서 데이터 페치 (SSR)
- `recharts` 라이브러리로 파이/라인/바 차트 클라이언트 렌더링
- URL searchParams 기반 필터 상태 (공유·새로고침 가능)
- 기존 `DashboardClient` 패턴 (Server Component page + Client Component chart) 유지

### 1.2 Design Principles

- Server Component에서 집계 쿼리 실행, Client Component에 데이터 prop으로 전달
- 차트 컴포넌트는 `'use client'` + `dynamic import` (SSR 비활성화)
- 빈 데이터 처리: 각 차트에 빈 상태 UI 제공

---

## 2. Architecture

### 2.1 컴포넌트 다이어그램

```
Browser (User)
    │
    ▼
app/dashboard/analytics/page.tsx  [Server Component]
    │  searchParams: { from?, to?, preset? }
    │  → lib/analytics/queries.ts 호출 (Supabase 집계)
    │  → AnalyticsClient에 데이터 props 전달
    ▼
components/analytics/AnalyticsClient.tsx  [Client Component]
    ├── DateRangeFilter.tsx          — 기간 필터 (preset + 커스텀)
    ├── SummaryCards.tsx             — 요약 카드 (총 매출·건수·평균)
    ├── MenuPieChart.tsx             — 메뉴별 파이차트 (recharts)
    ├── DailyLineChart.tsx           — 일별 추세 라인차트 (recharts)
    └── TerminalBarChart.tsx         — 단말기별 바차트 (recharts)

lib/analytics/queries.ts             — Supabase 집계 쿼리 함수
```

### 2.2 데이터 흐름

```
URL ?from=2026-03-01&to=2026-03-24
    │
    ▼ page.tsx (Server)
    ├── getMenuSummary(merchantId, from, to)       → MenuData[]
    ├── getDailySummary(merchantId, from, to)      → DailyData[]
    ├── getTerminalSummary(merchantId, from, to)   → TerminalData[]
    └── getTotalSummary(...)                        → SummaryData
    │
    ▼ AnalyticsClient (Client)
    └── 차트 컴포넌트에 분배 → recharts 렌더링
```

### 2.3 의존성

| 컴포넌트 | 의존 | 목적 |
|---------|------|------|
| page.tsx | lib/analytics/queries.ts | 집계 쿼리 |
| AnalyticsClient | DateRangeFilter, SummaryCards, Charts | UI 조합 |
| 모든 차트 | recharts | 차트 렌더링 |
| queries.ts | @/lib/supabase/server | DB 접근 |

---

## 3. Data Model

### 3.1 쿼리 결과 타입

```typescript
// lib/analytics/types.ts (또는 queries.ts 내 export)

export interface MenuSummary {
  menu_name: string
  total_amount: number
  count: number
  ratio: number  // 전체 대비 비율 (0~1)
}

export interface DailySummary {
  date: string         // 'YYYY-MM-DD'
  total_amount: number
  count: number
}

export interface TerminalSummary {
  terminal_id: string
  terminal_name: string
  term_id: string
  total_amount: number
  count: number
}

export interface AnalyticsSummary {
  totalAmount: number
  totalCount: number
  avgAmount: number    // totalAmount / totalCount
  from: string
  to: string
}
```

### 3.2 기존 DB 활용

신규 테이블 없음. 기존 `transactions` 테이블 집계:

```sql
-- 메뉴별 집계 예시
SELECT menu_name,
       SUM(amount) AS total_amount,
       COUNT(*)    AS count
FROM transactions
WHERE merchant_id = $1
  AND status = 'success'
  AND approved_at BETWEEN $2 AND $3
GROUP BY menu_name
ORDER BY total_amount DESC;

-- 일별 집계 예시
SELECT DATE(approved_at) AS date,
       SUM(amount)       AS total_amount,
       COUNT(*)          AS count
FROM transactions
WHERE merchant_id = $1
  AND status = 'success'
  AND approved_at BETWEEN $2 AND $3
GROUP BY DATE(approved_at)
ORDER BY date;

-- 단말기별 집계 예시
SELECT t.terminal_id,
       tm.name AS terminal_name,
       tm.term_id,
       SUM(t.amount) AS total_amount,
       COUNT(*)      AS count
FROM transactions t
JOIN terminals tm ON tm.id = t.terminal_id
WHERE t.merchant_id = $1
  AND t.status = 'success'
  AND t.approved_at BETWEEN $2 AND $3
GROUP BY t.terminal_id, tm.name, tm.term_id
ORDER BY total_amount DESC;
```

> **구현 방식**: Supabase JS SDK `.select()` + `.gte()` / `.lte()` 필터로 전체 행 조회 후 JS에서 집계
> (Supabase JS SDK는 GROUP BY 직접 지원 안 함 → 행 조회 후 reduce)

---

## 4. API / 쿼리 명세

신규 API 라우트 없음. Server Component에서 Supabase 직접 호출.

### lib/analytics/queries.ts 함수 명세

```typescript
// 메뉴별 집계
export async function getMenuSummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,   // 'YYYY-MM-DDT00:00:00Z'
  to: string      // 'YYYY-MM-DDT23:59:59Z'
): Promise<MenuSummary[]>

// 일별 집계
export async function getDailySummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string
): Promise<DailySummary[]>

// 단말기별 집계
export async function getTerminalSummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string
): Promise<TerminalSummary[]>
```

---

## 5. UI/UX 설계

### 5.1 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ 매출 분석                    [오늘][이번주][이번달][직접] │
├──────────────┬──────────────┬──────────────────────────┤
│ 총 매출      │ 총 건수      │ 건당 평균                │
│ ₩1,234,000  │  42건        │ ₩29,381                  │
├──────────────┴──────────────┴──────────────────────────┤
│ 메뉴별 매출 (파이차트)       │ 메뉴 순위 테이블         │
│    [Pie Chart]               │ 1. 아메리카노 ₩xxx (35%) │
│                              │ 2. 라떼        ₩xxx (20%) │
├──────────────────────────────┴──────────────────────────┤
│ 기간별 매출 추세 (라인차트)                              │
│    [Line Chart]                                          │
├─────────────────────────────────────────────────────────┤
│ 단말기별 매출 (바차트)                                   │
│    [Bar Chart]                                           │
└─────────────────────────────────────────────────────────┘
```

### 5.2 기간 필터 동작

| 프리셋 | from | to |
|--------|------|----|
| 오늘 | today 00:00 | today 23:59 |
| 이번 주 | 이번 주 월요일 | 오늘 |
| 이번 달 | 이번 달 1일 | 오늘 |
| 직접 | 사용자 입력 | 사용자 입력 |

URL 예시: `/dashboard/analytics?preset=week`
또는: `/dashboard/analytics?from=2026-03-01&to=2026-03-24`

### 5.3 컴포넌트 목록

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| `AnalyticsClient` | `components/analytics/` | 전체 레이아웃 조율, 클라이언트 진입점 |
| `DateRangeFilter` | `components/analytics/` | 프리셋 버튼 + date input, URL 업데이트 |
| `SummaryCards` | `components/analytics/` | 총 매출·건수·평균 3개 카드 |
| `MenuPieChart` | `components/analytics/` | recharts PieChart + 순위 테이블 |
| `DailyLineChart` | `components/analytics/` | recharts LineChart |
| `TerminalBarChart` | `components/analytics/` | recharts BarChart |

### 5.4 빈 상태 UI

- 거래 없는 경우: 각 차트 영역에 "선택 기간에 거래 내역이 없습니다." 메시지
- 로딩: Server Component이므로 Suspense 경계 활용 (Next.js loading.tsx)

---

## 6. 파일 구조

```
app/dashboard/
  analytics/
    page.tsx              — Server Component (집계 쿼리 + AnalyticsClient 렌더)
    loading.tsx           — Suspense fallback (스켈레톤 UI)

components/analytics/
  AnalyticsClient.tsx     — 'use client', 차트 레이아웃
  DateRangeFilter.tsx     — 'use client', 기간 필터
  SummaryCards.tsx        — 순수 표시 컴포넌트
  MenuPieChart.tsx        — 'use client', recharts PieChart
  DailyLineChart.tsx      — 'use client', recharts LineChart
  TerminalBarChart.tsx    — 'use client', recharts BarChart

lib/analytics/
  queries.ts              — 집계 쿼리 함수 (Supabase 서버 클라이언트)
```

### app/dashboard/layout.tsx 수정
네비게이션에 "분석" 항목 추가:
```tsx
<NavItem href="/dashboard/analytics">매출 분석</NavItem>
```

---

## 7. 구현 순서

1. [ ] `npm install recharts` 의존성 추가
2. [ ] `lib/analytics/queries.ts` — 집계 함수 3개 구현
3. [ ] `app/dashboard/analytics/page.tsx` — 기간 파라미터 파싱 + 쿼리 호출
4. [ ] `components/analytics/SummaryCards.tsx` — 요약 카드
5. [ ] `components/analytics/DateRangeFilter.tsx` — 기간 필터 UI
6. [ ] `components/analytics/MenuPieChart.tsx` — 파이차트
7. [ ] `components/analytics/DailyLineChart.tsx` — 라인차트
8. [ ] `components/analytics/TerminalBarChart.tsx` — 바차트
9. [ ] `components/analytics/AnalyticsClient.tsx` — 차트 레이아웃 조합
10. [ ] `app/dashboard/layout.tsx` — 네비게이션 링크 추가
11. [ ] `app/dashboard/analytics/loading.tsx` — 로딩 스켈레톤

---

## 8. 에러 처리

| 상황 | 처리 방법 |
|------|----------|
| 거래 없음 | 각 차트 내 빈 상태 메시지 |
| Supabase 오류 | page.tsx에서 `data ?? []` 빈 배열 fallback |
| 차트 SSR 오류 | `dynamic(() => import(...), { ssr: false })` |

---

## 9. 보안 고려사항

- [ ] 가맹점 인증: `createClient()` + `supabase.auth.getUser()` (layout에서 이미 처리)
- [ ] merchantId 는 `merchant_users` 테이블에서 user_id로 조회 (직접 입력 아님)
- [ ] RLS: `transactions` 테이블의 `merchants see own transactions` 정책으로 자동 필터

---

## 10. 테스트 계획

| 항목 | 방법 |
|------|------|
| 기간 필터 동작 | 브라우저 수동 테스트 (URL 파라미터 변경) |
| 빈 데이터 상태 | 거래 없는 날짜 선택 |
| 차트 렌더링 | 브라우저 시각 확인 |
| TypeScript | `npx tsc --noEmit` |

---

## 버전 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 0.1 | 2026-03-24 | 초안 작성 |
