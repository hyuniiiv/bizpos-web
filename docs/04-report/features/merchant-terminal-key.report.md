# [Report] merchant-terminal-key

> PDCA 완료 보고서 — 가맹점 키 + 단말기 관리 + JWT 인증 피처

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem Solved** | 다중 단말기 POS 환경에서 가맹점 키 관리 및 JWT 기반 단말기 인증 체계 부재로 보안 취약 및 관리 불가 |
| **Solution Approach** | merchant_keys CRUD, terminals 관리, device/auth JWT 발급, 관리자 콘솔 전체 구현 |
| **Function/UX Effect** | POS RF카드·QR 결제 정상 동작, 관리자 콘솔 실시간 거래 조회(3건/24,000원), 단말기별 권한 분리 |
| **Core Value** | 엔터프라이즈급 다단말기 운영 기반 확보 — 보안 인증, 실시간 모니터링, 감사 추적 가능 |

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **피처명** | merchant-terminal-key |
| **작업일** | 2026-03-23 |
| **테스트 방법** | Playwright E2E (브라우저 자동화) |
| **테스트 범위** | 전체 페이지/기능 (대시보드, 키 관리, 단말기 관리, POS 화면, 관리자 콘솔) |

---

## 2. 구현 완료 항목

### 2.1 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 상태 |
|-----------|--------|------|------|
| `/api/merchant/keys` | GET, POST | 가맹점 키 목록/등록 | ✅ |
| `/api/merchant/keys/[id]` | GET, PUT, DELETE | 키 조회/수정/삭제 | ✅ |
| `/api/terminals` | GET, POST | 단말기 목록/추가 | ✅ |
| `/api/terminals/[id]` | GET, PUT, DELETE | 단말기 조회/수정/삭제 | ✅ |
| `/api/terminals/[id]/key` | PUT | 단말기에 merchant_key 연결 | ✅ |
| `/api/terminals/[id]/account` | PUT | 단말기 계정 설정 (bcrypt) | ✅ |
| `/api/device/auth` | POST | 단말기 JWT 발급 | ✅ |

### 2.2 핵심 수정 사항

1. **`.env.local`**: `SUPABASE_SERVICE_ROLE_KEY`를 hex → 유효한 JWT로 교체 (PGRST301 오류 해결)
2. **`app/api/device/auth/route.ts`**: PostgREST FK 캐시 의존 제거 → `merchant_keys` 별도 쿼리
3. **Next.js 15 params**: `params: { id: string }` → `params: Promise<{ id: string }>` (3개 파일)

---

## 3. Playwright E2E 테스트 결과

### 3.1 대시보드 / 인증

| 항목 | 결과 |
|------|------|
| 로그인/로그아웃 | ✅ PASS |
| 대시보드 메인 | ✅ PASS |
| 거래내역 조회 (날짜 필터) | ✅ PASS |
| 설정 페이지 | ✅ PASS |

### 3.2 키 관리 (merchant_keys)

| 항목 | 결과 |
|------|------|
| 키 목록 조회 | ✅ PASS |
| 키 등록 (MID/encKey/onlineAK) | ✅ PASS |
| 키 수정 | ✅ PASS |
| 상태 토글 (활성/비활성) | ✅ PASS |
| 키 삭제 (확인 다이얼로그) | ✅ PASS |

### 3.3 단말기 관리 (terminals)

| 항목 | 결과 | 비고 |
|------|------|------|
| 단말기 추가 | ✅ PASS | 중복 term_id → raw DB 에러 노출 이슈 |
| 단말기 삭제 | ✅ PASS | |
| merchant_key 연결 | ✅ PASS | |
| 단말기 계정 설정 | ✅ PASS | bcrypt hash 저장 확인 |
| device/auth JWT 발급 | ✅ PASS | merchantKey 포함 응답 |

### 3.4 POS 화면 (/pos)

| 항목 | 결과 | 비고 |
|------|------|------|
| RF카드 바코드 스캔 → 결제 | ✅ PASS | 판매량 카운트 증가 |
| QR코드 스캔 (3-BP-39...) | ✅ PASS | ProcessingScreen 표시 |
| 미인식 바코드 → FailScreen | ✅ PASS | 3초 자동 복귀, DOM 검증 |
| 중복 바코드 방지 | ✅ PASS | IndexedDB scannedAt 갱신 없음 |
| 판매량 카운트 누적 | ✅ PASS | 0 → 3건 |

### 3.5 POS Admin (/pos/admin)

| 항목 | 결과 |
|------|------|
| PIN 인증 | ✅ PASS |
| 현황 탭 - 식수 카운트 조회 | ✅ PASS |
| 메뉴별 카운트 초기화 (3→0) | ✅ PASS |
| 설정 탭 - 설정 저장 | ✅ PASS |

### 3.6 관리자 콘솔 (/admin/*)

| 항목 | 결과 | 비고 |
|------|------|------|
| 실시간 거래관리 | ✅ PASS | Realtime 연결됨, 3건/24,000원 |
| 거래내역 조회 (필터) | ✅ PASS | 메뉴/결제수단/상태 필터 |
| 거래 취소 | ✅ PASS | confirm 다이얼로그 → "취소 완료" |
| 메뉴 설정/수정 | ✅ PASS | 결제금액 8,000→9,000 변경 |
| 단말기 설정 조회 | ✅ PASS | |
| 식수 카운트 관리 | ✅ PASS | 메뉴별 초기화, 자동 초기화 설정 |

---

## 4. 발견된 이슈

| # | 항목 | 위치 | 심각도 | 상태 |
|---|------|------|--------|------|
| 1 | 단말기 추가 중복 term_id → raw DB 에러 노출 | `app/dashboard/terminals/AddTerminalButton.tsx` | 중간 | ✅ Fixed |
| 2 | POS Hydration 오류 (SingleMenuScreen SSR/CSR) | `components/pos/SingleMenuScreen.tsx` | 낮음 | ✅ Fixed |
| 3 | `/sounds/success.mp3` 파일 없음 (404) | `public/sounds/` | 낮음 | Open |
| 4 | adminPin 기본값 placeholder → 초기 설정 불가 | `lib/store/settingsStore.ts` | 중간 | Open |
| 5 | `/admin/device` PIN 해시 원문 input 필드 노출 | `app/admin/device/page.tsx` | 중간 | ✅ Fixed |

---

## 5. 버그 픽스 (2026-03-23 추가)

Gap 분석 100% Match Rate 기반으로 3개 이슈 수정 완료.

| # | 파일 | 수정 내용 |
|---|------|---------|
| 1 | `app/admin/device/page.tsx` | `pinInput` 별도 state 분리 → bcrypt 해시 원문 input 노출 제거, `placeholder="변경하려면 새 PIN 입력"`, 빈 값이면 기존 PIN 유지 |
| 2 | `app/dashboard/terminals/AddTerminalButton.tsx` | `data.error?.message` 추출 후 duplicate/unique 키워드 감지 → "이미 사용 중인 단말기 ID입니다." 친화적 메시지 |
| 3 | `components/pos/SingleMenuScreen.tsx` | `mounted` state 패턴 추가 → `config.corner`, `totalCount` SSR fallback으로 Hydration 오류 제거 |

---

## 6. 다음 단계

### 잔여 Open 이슈
- [ ] `public/sounds/success.mp3` 파일 추가 (404 오류)
- [ ] 관리자 PIN 초기 설정 온보딩 플로우 (`adminPin` placeholder 문제)
- [ ] API 에러 핸들링 레이어 표준화

---

*보고서 생성: 2026-03-23 | Playwright E2E 테스트 기반 검증 | 버그 픽스 추가: 2026-03-23*
