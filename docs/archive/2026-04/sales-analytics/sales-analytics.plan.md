# [Plan] sales-analytics

## 개요
**Feature**: 매출 분석 대시보드
**Stack**: Next.js App Router + Supabase PostgreSQL
**목표**: 가맹점 관리자가 메뉴별·단말기별·기간별 매출 추세를 차트로 분석할 수 있는 분석 화면 구현

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 거래내역 테이블은 있지만 집계/시각화 없어 매출 패턴 파악 불가 |
| **Solution** | Supabase 집계 쿼리 + Recharts 차트 컴포넌트로 분석 대시보드 구현 |
| **Function/UX Effect** | 날짜 범위 선택 → 메뉴별 파이차트, 기간별 라인차트, 단말기별 바차트 즉시 표시 |
| **Core Value** | 데이터 기반 운영 의사결정 (인기 메뉴 파악, 피크 타임 분석) |

---

## 배경 및 문제 정의

### 현재 상태 (AS-IS)
- `/dashboard/transactions` : 날짜별 거래 목록만 조회 가능 (테이블 뷰)
- 매출 합계·건수 표시는 있지만 추세/비교 분석 없음
- 메뉴별 인기도, 단말기별 매출 분배, 시간대별 패턴 파악 불가

### 목표 상태 (TO-BE)
- `/dashboard/analytics` 신규 페이지
- 기간 선택 (오늘 / 이번 주 / 이번 달 / 직접 선택)
- 메뉴별 매출 분석 (파이차트 + 순위 테이블)
- 기간별 매출 추세 (라인차트, 일별 집계)
- 단말기별 매출 비교 (바차트)

---

## 핵심 기능 요구사항

### FR-01. 기간 필터
- 프리셋: 오늘 / 이번 주 / 이번 달
- 커스텀: 시작일 ~ 종료일 직접 입력
- URL 쿼리 파라미터 동기화 (`?from=&to=`)

### FR-02. 메뉴별 매출 분석
- Supabase 집계: `menu_name` 기준 `SUM(amount)`, `COUNT(*)` GROUP BY
- 파이차트 (Recharts PieChart)
- 상위 메뉴 순위 테이블 (순위 / 메뉴명 / 매출액 / 건수 / 비율)

### FR-03. 기간별 매출 추세
- 일별 `SUM(amount)` 집계
- 라인차트 (Recharts LineChart)
- 비교 기능: 전 기간 대비 증감률 표시

### FR-04. 단말기별 매출 비교
- 단말기 기준 `SUM(amount)` GROUP BY
- 바차트 (Recharts BarChart)
- 단말기 이름 표시 (terminals 테이블 JOIN)

### FR-05. 요약 카드
- 선택 기간 총 매출, 총 건수, 평균 건당 금액
- 전 기간 대비 증감 (금액·비율)

---

## 기술 스택

```
app/dashboard/analytics/
  page.tsx              — 서버 컴포넌트 (기간 파라미터 수신, 데이터 페치)
  AnalyticsClient.tsx   — 클라이언트 컴포넌트 (차트 렌더링)

components/analytics/
  MenuPieChart.tsx      — 메뉴별 파이차트
  DailyLineChart.tsx    — 일별 추세 라인차트
  TerminalBarChart.tsx  — 단말기별 바차트
  SummaryCards.tsx      — 요약 카드

lib/analytics/
  queries.ts            — Supabase 집계 쿼리 함수
```

**차트 라이브러리**: `recharts` (이미 Next.js 생태계 표준, 번들 크기 적절)

---

## 구현 우선순위

| 순서 | 항목 | 중요도 |
|------|------|--------|
| 1 | 기간 필터 + 집계 쿼리 (`lib/analytics/queries.ts`) | 필수 |
| 2 | 메뉴별 파이차트 + 순위 테이블 (FR-02) | 필수 |
| 3 | 요약 카드 (FR-05) | 높음 |
| 4 | 기간별 라인차트 (FR-03) | 높음 |
| 5 | 단말기별 바차트 (FR-04) | 중간 |
| 6 | 전 기간 증감 비교 | 낮음 |

---

## 아키텍처 결정

| 항목 | 선택 | 이유 |
|------|------|------|
| 데이터 페치 | Server Component (page.tsx) | 집계 쿼리 결과 SSR, SEO 불필요하지만 초기 로딩 빠름 |
| 차트 | recharts | 경량, React 친화적, Pie/Line/Bar 모두 지원 |
| 집계 방식 | Supabase JS 쿼리 (클라이언트) | RPC 불필요, 필터 조건 동적 구성 용이 |
| 상태 | URL searchParams | 새로고침·공유 가능한 필터 상태 |

---

## 성공 기준

- [ ] `/dashboard/analytics` 페이지 접근 가능
- [ ] 오늘/이번 주/이번 달 프리셋 필터 동작
- [ ] 메뉴별 파이차트 정상 렌더링
- [ ] 기간별 라인차트 정상 렌더링
- [ ] 단말기별 바차트 정상 렌더링
- [ ] 거래 없는 날짜 처리 (빈 상태 UI)
- [ ] TypeScript 오류 없음

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| recharts 미설치 | 빌드 실패 | `npm install recharts` |
| 대량 거래 데이터 성능 | 느린 집계 쿼리 | DB 인덱스 활용 (`idx_transactions_merchant`) |
| 차트 SSR 이슈 | hydration 오류 | `'use client'` + dynamic import |

---

## 다음 단계

1. [ ] `npm install recharts` 의존성 추가
2. [ ] `/pdca design sales-analytics`
3. [ ] 구현 후 `/pdca analyze sales-analytics`

---

## 버전 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 0.1 | 2026-03-24 | 초안 작성 |
