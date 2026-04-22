# pos-realtime-dashboard Plan

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | POS 대기 화면이 단순 메뉴 선택/대기 화면만 표시해 당일 거래 현황을 파악할 수 없었음 |
| Solution | 실시간 거래 목록 대시보드(RealTimeDashboard)로 POS 기본 화면을 교체하여 총 거래건·매출액·거래 내역을 즉시 확인 가능하게 함 |
| Function UX Effect | POS 화면이 스캔 대기 중에도 총 거래건수·매출액 요약과 최근 거래 목록을 실시간으로 보여줌 |
| Core Value | 식당 담당자가 POS 화면에서 당일 식수 현황을 별도 조회 없이 즉시 파악 가능 |

---

## 1. 피처 목표

고객 요청(폴리텍 식수체크 개선요청): POS 메인 화면을 "학식앱 식수관리 실시간 거래관리" 화면처럼 개선.

### 1.1 요구사항

| # | 요구사항 | 우선순위 |
|---|---------|--------|
| 1 | 당일 총 거래건수 표시 | High |
| 2 | 당일 총 매출액 표시 | High |
| 3 | 최근 거래 목록 (시간·사용자·메뉴·금액) | High |
| 4 | 30초 자동 갱신 | Medium |
| 5 | 새 거래 완료 시 즉시 갱신 | Medium |
| 6 | 오프라인 상태 표시 | Low |

### 1.2 범위

**포함:**
- `components/pos/RealTimeDashboard.tsx` — 새 대시보드 컴포넌트
- `app/pos/page.tsx` — 기존 SingleMenuScreen/MenuSelectScreen → RealTimeDashboard 교체

**제외:**
- 날짜 범위 필터 (오늘만 표시)
- 취소 거래 표시

---

## 2. 기술 스택

- Next.js 15 App Router (`'use client'`)
- Zustand (`useSettingsStore`)
- `/api/transactions` API (기존)
- Tailwind CSS (dark theme, bg-[#0F1B4C])
