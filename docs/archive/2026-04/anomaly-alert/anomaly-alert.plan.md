# [Plan] anomaly-alert

## 개요
**Feature**: 이상 거래 감지 알림
**Stack**: Next.js App Router + Supabase (DB 집계 + Realtime 선택적)
**목표**: 짧은 시간 내 동일 바코드 중복 사용, 비정상적 고액 거래 등 이상 패턴을 감지하고 관리자에게 대시보드 알림 표시

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 이상 거래(중복 바코드, 고액 이상거래) 발생 시 관리자가 실시간으로 인지할 방법 없음 |
| **Solution** | 거래 저장 시 이상 패턴 DB 체크 → 이상 감지 시 `anomaly_alerts` 테이블 기록 → 대시보드 배지 표시 |
| **Function/UX Effect** | 대시보드 상단에 알림 배지, 알림 목록 페이지에서 상세 확인 및 처리 완료 표시 |
| **Core Value** | 부정 사용 조기 감지, 가맹점 신뢰도 향상 |

---

## 배경 및 문제 정의

### 현재 상태 (AS-IS)
- 거래 저장 API (`/api/transactions` 또는 단말기 직접 Supabase insert)만 존재
- 이상 패턴 감지 로직 없음
- 관리자 대시보드에 알림 기능 없음

### 목표 상태 (TO-BE)
- 거래 저장 시 이상 감지 규칙 실행 (서버 사이드)
- 이상 감지 시 `anomaly_alerts` 레코드 생성
- 대시보드 네비게이션에 미확인 알림 배지
- `/dashboard/alerts` 알림 목록/처리 페이지

---

## 이상 감지 규칙

### Rule-01. 동일 바코드 중복 사용
- 동일 `barcode_info`가 **10분 내 2회 이상** 결제 성공
- 심각도: HIGH

### Rule-02. 단기간 고빈도 결제
- 동일 단말기에서 **1분 내 10건 이상** 결제
- 심각도: MEDIUM

### Rule-03. 비정상 고액 거래
- 단일 거래 금액 **50,000원 이상** (가맹점 설정으로 임계값 변경 가능)
- 심각도: LOW (알림만, 차단 아님)

---

## 핵심 기능 요구사항

### FR-01. DB 스키마 추가
```sql
CREATE TABLE anomaly_alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  uuid NOT NULL REFERENCES merchants(id),
  terminal_id  uuid REFERENCES terminals(id),
  transaction_id uuid REFERENCES transactions(id),
  rule         text NOT NULL,       -- 'duplicate_barcode' | 'high_frequency' | 'high_amount'
  severity     text NOT NULL,       -- 'HIGH' | 'MEDIUM' | 'LOW'
  detail       jsonb,               -- 감지 상세 정보
  resolved     bool NOT NULL DEFAULT false,
  resolved_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);
```

### FR-02. 이상 감지 서버 함수
- `lib/anomaly/detector.ts`: 각 Rule 구현
- 거래 저장 API에서 감지 함수 호출 (비동기, 응답 블로킹 안 함)

### FR-03. 대시보드 알림 배지
- `app/dashboard/layout.tsx`에 미확인 알림 카운트 표시
- Supabase Realtime 구독 (선택적) 또는 페이지 진입 시 조회

### FR-04. 알림 목록 페이지
- `/dashboard/alerts` 페이지
- 미확인 / 전체 토글
- 알림 상세: 규칙명, 심각도, 관련 거래 링크, 발생 시간
- "처리 완료" 버튼 → `resolved = true` 업데이트

---

## 구현 범위

```
supabase/schema.sql      — anomaly_alerts 테이블 추가

lib/anomaly/
  detector.ts            — 이상 감지 규칙 함수

app/dashboard/
  alerts/page.tsx        — 알림 목록 페이지
  layout.tsx             — 알림 배지 추가

types/supabase.ts        — AnomalyAlert 인터페이스 추가
```

---

## 구현 우선순위

| 순서 | 항목 | 중요도 |
|------|------|--------|
| 1 | DB 스키마 (`anomaly_alerts`) | 필수 |
| 2 | Rule-01 중복 바코드 감지 | 높음 |
| 3 | 알림 목록 페이지 | 높음 |
| 4 | 대시보드 알림 배지 | 중간 |
| 5 | Rule-02 고빈도 감지 | 중간 |
| 6 | Rule-03 고액 감지 | 낮음 |
| 7 | Realtime 실시간 알림 | 낮음 |

---

## 성공 기준

- [ ] 동일 바코드 10분 내 2회 결제 시 알림 생성
- [ ] `/dashboard/alerts` 페이지 알림 목록 표시
- [ ] "처리 완료" 버튼 동작
- [ ] 대시보드 네비게이션 알림 배지 표시
- [ ] TypeScript 오류 없음

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 감지 로직이 거래 저장 응답 지연 | UX 저하 | 비동기 실행 (응답 후 백그라운드) |
| Rule 임계값 오탐 | 불필요한 알림 | 첫 릴리즈는 LOW/MEDIUM만, HIGH는 보수적 임계값 |
| anomaly_alerts RLS 설정 | 권한 오류 | merchants manage 정책과 동일 패턴 적용 |

---

## 의존성

- **선행**: `sales-analytics` 불필요 (독립적)
- **선행**: `error-response-unify` 불필요 (독립적)
- 기존 `transactions` 테이블 및 API 필요 ✅

---

## 다음 단계

1. [ ] `/pdca design anomaly-alert`
2. [ ] Supabase SQL Editor에서 `anomaly_alerts` 테이블 생성
3. [ ] 구현 후 `/pdca analyze anomaly-alert`

> **우선순위 참고**: `sales-analytics` → `error-response-unify` → `anomaly-alert` 순서로 구현 권장

---

## 버전 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 0.1 | 2026-03-24 | 초안 작성 (online-management F-05 하위 기능) |
