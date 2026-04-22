# error-response-unify Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: BIZPOS Web
> **Analyst**: gap-detector
> **Date**: 2026-03-24
> **Design Doc**: [error-response-unify.design.md](../02-design/features/error-response-unify.design.md)

---

## 1. 분석 개요

### 1.1 분석 목적

error-response-unify 피처의 Design 문서와 실제 구현 코드 간 일치도를 검증하고, 미구현/불일치 항목을 식별한다.

### 1.2 분석 범위

- **Design 문서**: `docs/02-design/features/error-response-unify.design.md`
- **구현 파일**: `lib/api/error.ts`, `types/online.ts`, `app/api/device/auth/route.ts`, `app/api/device/activate/route.ts`, `lib/terminal/auth.ts`
- **분석일**: 2026-03-24

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 lib/api/error.ts — 핵심 변경

| 항목 | Design 명세 | 구현 | 상태 |
|------|------------|------|:----:|
| 시그니처 | `apiError(code: string, message?: string, status: number = 500)` | 일치 | ✅ |
| 반환 포맷 | `{ error: code, message?: message }` (플랫) | 일치 | ✅ |
| 조건부 message | `if (message) body.message = message` | 일치 | ✅ |

### 2.2 types/online.ts — ApiErrorResponse 추가

| 항목 | Design 명세 | 구현 | 상태 |
|------|------------|------|:----:|
| 인터페이스 정의 | `{ error: string; message?: string }` | 일치 | ✅ |
| 위치 | `types/online.ts` | `types/online.ts` | ✅ |

### 2.3 에러 코드 (11개)

**activate 라우트** — 4개 코드 일치 (MISSING_CODE/400, INVALID_CODE/404, ALREADY_ACTIVATED/409, ACTIVATION_FAILED/500)

**auth 라우트** — 5개 코드 일치 (INVALID_BODY/400, MISSING_CREDENTIALS/400, INVALID_CREDENTIALS/401, TERMINAL_INACTIVE/403, ACCOUNT_NOT_CONFIGURED/401)

**requireTerminalAuth** — 2개 코드 일치 (UNAUTHORIZED/401, INVALID_TOKEN/401)

### 2.4 파일 변경 범위 (7개 파일)

| 파일 | Design 예상 | 실제 | 상태 |
|------|:----------:|:----:|:----:|
| `lib/api/error.ts` | 수정 | 수정 | ✅ |
| `types/online.ts` | 추가 | 추가 | ✅ |
| `app/api/device/auth/route.ts` | 변경 없음 | 변경 없음 | ✅ |
| `app/api/device/activate/route.ts` | 변경 없음 | 변경 없음 | ✅ |
| `lib/terminal/auth.ts` | 변경 없음 | 변경 없음 | ✅ |
| `app/api/device/config/route.ts` | 변경 없음 | 변경 없음 | ✅ |
| `app/api/device/heartbeat/route.ts` | 변경 없음 | 변경 없음 | ✅ |

**파일 범위 일치율: 100% (7/7)**

### 2.5 클라이언트 호환성

`lib/onlineSync.ts` — `{ success: false, error: data.error }` 형태로 `data.error`를 문자열로 참조.
`apiError()` 수정 후 모든 라우트에서 `data.error = string` → **호환 확인**.

---

## 3. Match Rate Summary

```
┌─────────────────────────────────────────────────────┐
│  Overall Match Rate: 100%               PASS        │
├─────────────────────────────────────────────────────┤
│  ✅ Match:    19 items  (100%)                       │
│  🔴 Missing:   0 items  (0%)                        │
│  🟡 Added:     0 items  (0%)                        │
│  🔵 Changed:   0 items  (0%)                        │
└─────────────────────────────────────────────────────┘
```

---

## 4. Gap 목록

Gap 없음.

---

## 5. 참고 사항 (Gap 아님)

| # | 항목 | 설명 | 우선순위 |
|---|------|------|:--------:|
| 1 | activate 라우트 헬퍼 미사용 | 5개 인라인 `NextResponse.json`을 `apiError()`로 통일 가능 | Backlog |
| 2 | ApiErrorResponse 미참조 | 타입 정의됐으나 클라이언트 코드에서 미사용 | Backlog |

---

## 6. 판정

| 기준 | 값 | 결과 |
|------|---|:----:|
| Match Rate | **100%** | >= 90% ✅ PASS |
| Critical Gap | 0건 | ✅ PASS |
| High Impact Gap | 0건 | ✅ PASS |

**Match Rate 100% — Act(iterate) 불필요, Report 단계로 진행.**

---

## Version History

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-03-24 | 초회 Gap 분석 (gap-detector) |
