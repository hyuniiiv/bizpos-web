# [Design] error-response-unify

> **Summary**: Device API 에러 응답 포맷을 `{ error: string, message?: string }` 플랫 구조로 통일
>
> **Project**: BIZPOS Web
> **Date**: 2026-03-24
> **Status**: Draft
> **Planning Doc**: [error-response-unify.plan.md](../../01-plan/features/error-response-unify.plan.md)

---

## 1. Overview

### 1.1 현재 상태 분석 (AS-IS)

코드베이스 분석 결과 다음 3가지 에러 응답 패턴이 혼재:

| 패턴 | 포맷 | 사용 위치 |
|------|------|----------|
| A — 플랫 직접 반환 | `{ error: "CODE" }` | `activate/route.ts` 전체, `requireTerminalAuth` |
| B — apiError (중첩) | `{ error: { code, message } }` | `auth/route.ts` (`apiError()` 호출) |
| C — 에러 없음 | HTTP 상태만 | `config`, `heartbeat` 일부 경로 |

**근본 원인**: `lib/api/error.ts`의 `apiError()` 반환 포맷이 `{ error: { code, message } }` (중첩)인데, 나머지 코드는 `{ error: "CODE" }` (플랫)을 사용.

### 1.2 목표 상태 (TO-BE)

모든 `/api/device/*` 에러 응답:
```json
{ "error": "ERROR_CODE", "message": "선택적 설명" }
```

`lib/api/error.ts`의 `apiError()` 시그니처 변경:
- **이전**: `apiError(code, message, status)` → `{ error: { code, message } }`
- **이후**: `apiError(code, message?, status)` → `{ error: code, message?: message }`

### 1.3 변경 범위

**최소 변경** 원칙 — 실제 불일치가 있는 1개 파일만 수정:

| 파일 | 변경 | 이유 |
|------|------|------|
| `lib/api/error.ts` | 반환 포맷 수정 | 중첩 → 플랫 |
| `lib/terminal/auth.ts` | 변경 없음 | 이미 플랫 포맷 |
| `app/api/device/activate/route.ts` | 변경 없음 | 이미 플랫 포맷 |
| `app/api/device/auth/route.ts` | 변경 없음 | `apiError()` 사용 → 헬퍼 수정으로 자동 해결 |
| `app/api/device/config/route.ts` | 변경 없음 | `requireTerminalAuth` 의존 |
| `app/api/device/heartbeat/route.ts` | 변경 없음 | `requireTerminalAuth` 의존 |
| `types/online.ts` | `ApiErrorResponse` 타입 추가 | 클라이언트 에러 파싱 타입 |

---

## 2. 변경 명세

### 2.1 lib/api/error.ts (핵심 변경)

**이전:**
```typescript
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}
```

**이후:**
```typescript
export function apiError(code: string, message?: string, status: number = 500) {
  const body: { error: string; message?: string } = { error: code }
  if (message) body.message = message
  return NextResponse.json(body, { status })
}
```

**변경 이유**:
- `auth/route.ts`가 `apiError()` 반환값을 클라이언트에서 `data.error`로 참조 → 기존엔 `data.error` = `{ code, message }` 객체
- 클라이언트 `lib/onlineSync.ts`는 `data.error`를 문자열로 기대
- 플랫 포맷이 `requireTerminalAuth`, `activate` 라우트와 일치

### 2.2 types/online.ts 추가

```typescript
export interface ApiErrorResponse {
  error: string        // 에러 코드 (예: 'UNAUTHORIZED')
  message?: string     // 선택적 설명
}
```

---

## 3. 에러 코드 정의

### activate 라우트
| 코드 | HTTP | 의미 |
|------|:----:|------|
| `MISSING_CODE` | 400 | activationCode 누락 |
| `INVALID_CODE` | 404 | 코드 불일치 |
| `ALREADY_ACTIVATED` | 409 | 이미 활성화된 단말기 |
| `ACTIVATION_FAILED` | 500 | DB 업데이트 실패 |

### auth 라우트
| 코드 | HTTP | 의미 |
|------|:----:|------|
| `INVALID_BODY` | 400 | JSON 파싱 실패 |
| `MISSING_CREDENTIALS` | 400 | 필드 누락 |
| `INVALID_CREDENTIALS` | 401 | 잘못된 자격증명 |
| `TERMINAL_INACTIVE` | 403 | 비활성 단말기 |
| `ACCOUNT_NOT_CONFIGURED` | 401 | 계정 미설정 |

### requireTerminalAuth (공유)
| 코드 | HTTP | 의미 |
|------|:----:|------|
| `UNAUTHORIZED` | 401 | 토큰 없음 |
| `INVALID_TOKEN` | 401 | 토큰 검증 실패 |

---

## 4. 영향 분석

### 클라이언트 사이드 (`lib/onlineSync.ts`)

`activateTerminal()` 에서 에러 파싱:
```typescript
// 현재 코드 — 플랫 포맷 기대
const data = await res.json()
if (!res.ok) {
  return { success: false, error: data.error }  // data.error = string
}
```

`apiError()` 수정 후 `auth` 라우트도 `data.error = string`이 되어 **호환**.

### 기존 동작 보존

`activate`, `config`, `heartbeat` 라우트는 코드 변경 없이 현재 그대로 동작.

---

## 5. 구현 순서

1. [ ] `lib/api/error.ts` — 반환 포맷 플랫으로 수정
2. [ ] `types/online.ts` — `ApiErrorResponse` 인터페이스 추가
3. [ ] `npx tsc --noEmit` 검증

---

## 6. 검증 기준

| 항목 | 검증 방법 |
|------|----------|
| `apiError()` 포맷 변경 | TypeScript 타입 확인 |
| `auth` 라우트 에러 응답 | `data.error = string` 확인 |
| 기존 라우트 동작 유지 | tsc 오류 없음 |
| 클라이언트 호환성 | `onlineSync.ts` 에러 파싱 정상 |

---

## 버전 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 0.1 | 2026-03-24 | 초안 작성 (코드베이스 분석 기반) |
