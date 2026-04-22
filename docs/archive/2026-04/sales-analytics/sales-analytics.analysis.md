# sales-analytics Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: BIZPOS Web
> **Analyst**: gap-detector
> **Date**: 2026-03-24
> **Design Doc**: [sales-analytics.design.md](../02-design/features/sales-analytics.design.md)

---

## 1. 분석 개요

### 1.1 분석 목적

sales-analytics 피쳐의 Design 문서(02-design)와 실제 구현 코드 간 일치도를 검증하고, 미구현/불일치 항목을 식별한다.

### 1.2 분석 범위

- **Design 문서**: `docs/02-design/features/sales-analytics.design.md`
- **구현 경로**: `lib/analytics/`, `components/analytics/`, `app/dashboard/analytics/`, `app/dashboard/layout.tsx`
- **분석일**: 2026-03-24

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 파일 구조

| Design 명세 파일 | 구현 파일 | 상태 |
|-----------------|----------|:----:|
| `app/dashboard/analytics/page.tsx` | 존재 (80줄, Server Component) | ✅ |
| `app/dashboard/analytics/loading.tsx` | 존재 (23줄, Skeleton UI) | ✅ |
| `components/analytics/AnalyticsClient.tsx` | 존재 (67줄, 'use client') | ✅ |
| `components/analytics/DateRangeFilter.tsx` | 존재 (78줄, 'use client') | ✅ |
| `components/analytics/SummaryCards.tsx` | 존재 (20줄, 순수 표시) | ✅ |
| `components/analytics/MenuPieChart.tsx` | 존재 (84줄, 'use client') | ✅ |
| `components/analytics/DailyLineChart.tsx` | 존재 (62줄, 'use client') | ✅ |
| `components/analytics/TerminalBarChart.tsx` | 존재 (55줄, 'use client') | ✅ |
| `lib/analytics/queries.ts` | 존재 (162줄) | ✅ |
| `app/dashboard/layout.tsx` 네비 링크 | "매출 분석" NavItem 존재 (L25) | ✅ |

**파일 구조 일치율: 100% (10/10)**

### 2.2 쿼리 함수

| Design 함수명 | 구현 함수명 | 상태 |
|--------------|-----------|:----:|
| `getMenuSummary(supabase, merchantId, from, to)` | `getMenuSummary(...)` | ✅ |
| `getDailySummary(supabase, merchantId, from, to)` | `getDailySummary(...)` | ✅ |
| `getTerminalSummary(supabase, merchantId, from, to)` | `getTerminalSummary(...)` | ✅ |
| `getTotalSummary(...)` | `getAnalyticsSummary(...)` | 🔵 이름 변경 |

**쿼리 함수 일치율: 92% (3 Match + 1 Changed)**

### 2.3 데이터 타입

| 타입 | 총 필드 | 일치 | 누락 | 일치율 |
|------|:------:|:----:|:----:|:------:|
| MenuSummary | 4 | 4 | 0 | 100% |
| DailySummary | 3 | 3 | 0 | 100% |
| TerminalSummary | 5 | 5 | 0 | 100% |
| AnalyticsSummary | 5 | 3 | 2 (`from`, `to`) | 60% |

**데이터 타입 일치율: 89% (17/19 필드)**

> `AnalyticsSummary.from/to` 누락: page.tsx에서 별도 변수로 관리하여 AnalyticsClient에 직접 전달하므로 기능 영향 없음. Design 문서 수정 권장.

### 2.4 컴포넌트

| 컴포넌트 | Design 역할 | 구현 확인 | 상태 |
|---------|-----------|----------|:----:|
| `AnalyticsClient` | 전체 레이아웃 조율 | dynamic import 3차트 + props 분배 | ✅ |
| `DateRangeFilter` | 프리셋 + date input + URL 업데이트 | 4프리셋, router.push | ✅ |
| `SummaryCards` | 총 매출/건수/평균 3카드 | grid-cols-3, 원화 포맷 | ✅ |
| `MenuPieChart` | PieChart + 순위 테이블 | recharts PieChart + 5열 순위 테이블 | ✅ |
| `DailyLineChart` | LineChart | recharts LineChart (MM-DD 포맷) | ✅ |
| `TerminalBarChart` | BarChart | recharts BarChart (단말기명 축) | ✅ |

**컴포넌트 일치율: 100% (6/6)**

### 2.5 UI/UX 기능

| Design 명세 | 구현 위치 | 상태 |
|------------|----------|:----:|
| 기간 프리셋 4종 (오늘/이번주/이번달/직접) | DateRangeFilter L7-12 | ✅ |
| URL searchParams 기반 필터 | page.tsx + router.push | ✅ |
| 직접 선택 시 date input | DateRangeFilter L53-69 | ✅ |
| 빈 상태 UI | 3개 차트 각각 처리 | ✅ |
| dynamic import SSR 비활성화 | AnalyticsClient L10-12 | ✅ |
| loading.tsx 스켈레톤 | animate-pulse | ✅ |
| 네비게이션 링크 | layout.tsx L25 | ✅ |
| Server Component 집계 + Client props | page.tsx Promise.all 4쿼리 | ✅ |
| 가맹점 인증 | page.tsx auth + merchant_users | ✅ |

**UI/UX 기능 일치율: 100% (9/9)**

---

## 3. Match Rate Summary

```
┌─────────────────────────────────────────────────────┐
│  Overall Match Rate: 96%                PASS        │
├─────────────────────────────────────────────────────┤
│  ✅ Match:    40 items  (93%)                        │
│  🔵 Changed:   1 item   (2%)                        │
│  🔴 Missing:   2 items  (5%)  ← Low impact          │
│  🟡 Added:     0 items  (0%)                        │
└─────────────────────────────────────────────────────┘
```

---

## 4. Gap 목록

### Missing (2건 — Low)

| # | 항목 | 영향 | 권장 조치 |
|---|------|:----:|---------|
| 1 | `AnalyticsSummary.from` | Low | Design 문서에서 제거 |
| 2 | `AnalyticsSummary.to` | Low | Design 문서에서 제거 |

### Changed (1건 — Low)

| # | 항목 | Design | 구현 | 권장 조치 |
|---|------|--------|------|---------|
| 1 | 집계 함수명 | `getTotalSummary` | `getAnalyticsSummary` | Design 문서 수정 |

### Code Quality (1건 — 수정 완료)

| # | 항목 | 파일 | 상태 |
|---|------|------|:----:|
| 1 | 미사용 `Legend` import | `MenuPieChart.tsx:3` | ✅ 수정 완료 |

---

## 5. 판정

| 기준 | 값 | 결과 |
|------|---|:----:|
| Match Rate | **96%** | >= 90% ✅ PASS |
| Critical Gap | 0건 | ✅ PASS |
| High Impact Gap | 0건 | ✅ PASS |

**Match Rate 96% >= 90% — Act(iterate) 불필요, Report 단계로 진행.**

---

## Version History

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-03-24 | 초회 Gap 분석 (gap-detector) |
