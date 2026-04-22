# [Analysis] online-management

> **Analysis Type**: Gap Analysis (Design vs Implementation)
> **Date**: 2026-03-24 | **Analyst**: gap-detector (v3)

---

## 1. Overall Scores

| Category | Score | Status | v2.0 |
|----------|:-----:|:------:|:----:|
| API Routes — Design Spec (6/6) | 100% | ✅ PASS | 100% |
| Supabase Libraries (3/3) | 100% | ✅ PASS | 100% |
| Terminal Auth (2/2) | 95% | ✅ PASS | 97% |
| Dashboard Pages (6/6) | 98% | ✅ PASS | 98% |
| Login / Middleware (2/2) | 100% | ✅ PASS | 100% |
| DB Schema + Indexes | 100% | ✅ PASS | 100% |
| Environment Variables | 90% | ✅ PASS | 100% |
| Realtime Integration | 90% | ✅ PASS | 90% |
| POS Client Layer (3/3) | 95% | ✅ PASS | 95% |
| Type Definitions (2/2) | 100% | ✅ PASS | 100% |
| Error Response Consistency | 75% | ⚠️ WARN | N/A |
| **Overall (weighted)** | **95%** | **✅ PASS** | **97%** |

> v3.0 신규: Error Response Consistency 카테고리 추가. 버그 2건 발견 및 수정 완료.

---

## 2. Missing Features (Design O, Implementation X)

| # | Item | Design Location | Impact |
|---|------|----------------|--------|
| 1 | Supabase Realtime 구독 (POS configSync) | Section 6-2 | Low — 30초 폴링으로 대체, 기능 동일 |

## 3. Added Features (Design X, Implementation O)

| # | Item | Location |
|---|------|----------|
| 1 | `POST /api/device/auth` (계정 기반 인증) | `app/api/device/auth/route.ts` |
| 2 | `/dashboard/keys` 페이지 | `app/dashboard/keys/page.tsx` |
| 3 | `merchant_keys` 테이블 + RLS + trigger | `supabase/migrations/20260323000001_merchant_terminal_key.sql` |
| 4 | Terminal 계정 컬럼 (`terminal_account_id`, `terminal_account_hash`) | 같은 migration |
| 5 | `check_terminal_health` / `mark_stale_terminals_offline` RPC | `supabase/schema.sql` |
| 6 | `shutdownOnlineSync()` | `lib/onlineSync.ts:126` |
| 7 | `idx_transactions_order_id` UNIQUE 인덱스 | `supabase/schema.sql` |
| 8 | 단말기 관리 CRUD API (8개 라우트) | `app/api/terminals/` |
| 9 | 가맹점 키 관리 API | `app/api/merchant/keys/` |
| 10 | `user_name`, `tid`, `cancelled_at` 컬럼 | `supabase/schema.sql` |
| 11 | `contact_email` 컬럼 (merchants) | `supabase/schema.sql` |
| 12 | `apiError()` 구조화 에러 헬퍼 | `lib/api/error.ts` |
| 13 | `SetupMerchant` 초기화 가이드 | `app/dashboard/SetupMerchant.tsx` |

## 4. Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|---------------|--------|
| 1 | JWT 만료 | 없음 or 1년 | 30일 (`setExpirationTime('30d')`) | Medium |
| 2 | JWT payload | 3필드 | + `merchantKeyId` optional | Low |
| 3 | `configSync.start()` 시그니처 | `start(accessToken)` | `startConfigPolling(onConfigChanged)` | Low |
| 4 | 배치 저장 방식 | INSERT | UPSERT on merchant_order_id | Low (개선) |
| 5 | 사이드바 | 4개 | 5개 (+키 관리) | Low |
| 6 | `activate` 응답 | 5필드 | + `configVersion` | Low (개선) |
| 7 | `access_token` 저장 | JWT seed hash | JWT 원문 저장 | Medium (보안 참고) |

---

## 5. Bugs Fixed (v3.0)

### 5.1 [FIXED] `shutdownOnlineSync()` sendBeacon 인증 불가

- **위치**: `lib/onlineSync.ts:133`
- **문제**: `navigator.sendBeacon()`은 커스텀 헤더 설정 불가 → heartbeat endpoint `requireTerminalAuth` 401 실패
- **수정**: `fetch({ keepalive: true })`로 교체 — 헤더 유지 + 페이지 언로드 시에도 전송 완료 보장

### 5.2 [FIXED] Terminal `status` 타입 불일치

- **위치**: `types/supabase.ts:23`
- **문제**: `'inactive'` 값이 revoke/auth 라우트에서 사용되나 타입에 미반영
- **수정**: `status: 'online' | 'offline' | 'inactive'`로 확장

---

## 6. Active Warnings

### 6.1 [WARN] 에러 응답 포맷 불일치

- `activate`, `heartbeat`, `transactions`: 평면 형식 `{ error: 'CODE' }`
- `auth`: 구조화 형식 `{ error: { code, message } }` via `apiError()`
- **권장**: 전체 device API를 `apiError()` 헬퍼로 통일

### 6.2 [INFO] access_token 저장 방식

- 설계: JWT seed hash 저장 명시
- 구현: JWT 원문 직접 저장
- **권장**: 설계 문서 현행화 (DB 유출 시 위험도 명시)

---

## 7. Recommended Design Doc Updates

| # | Item | 설계 위치 |
|---|------|----------|
| 1 | JWT 만료: "30일" 명시 | Section 4-1 |
| 2 | `access_token` 저장 방식 (원문 vs hash) | Section 4-1 step 4 |
| 3 | merchant_keys, /api/device/auth, /dashboard/keys 추가 | Section 2, 4, 5, 7 |
| 4 | 관리 CRUD API 목록 추가 | Section 4 |
| 5 | 추가 DB 컬럼 반영 | Section 2 |
| 6 | 환경변수 목록 현행화 | Section 3 |
| 7 | terminal status enum `'inactive'` 추가 | Section 2-2 |

---

## 8. Version History

| Version | Date | Match Rate | 주요 변경 |
|---------|------|:----------:|---------|
| 1.0 | 2026-03-23 | 88% | 초기 분석 (POS 클라이언트 레이어 미구현) |
| 2.0 | 2026-03-24 | 97% | onlineSync/configSync/txSync 구현, 타입 파일, partial index 추가 |
| 3.0 | 2026-03-24 | 95% | 심층 검증: sendBeacon 인증 버그, status 타입 불일치 발견 및 수정. Error Consistency 카테고리 신설. |

---

## 9. Conclusion

**Match Rate: 95%** — ✅ PASS

v3.0 심층 검증에서 발견된 버그 2건(sendBeacon 인증 불가, status 타입 불일치)은 즉시 수정 완료.
활성 경고 2건(에러 포맷 불일치, access_token 저장 방식)은 다음 피처 진행 전 정리 권장.
설계 문서 업데이트 7개 항목 남아있으나 기능 구현에는 영향 없음.

---

*분석일: 2026-03-24 | gap-detector v3*
