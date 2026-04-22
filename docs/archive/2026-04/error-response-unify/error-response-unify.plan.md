# [Plan] error-response-unify

## 개요
**Feature**: Device API 에러 응답 포맷 통일
**Stack**: Next.js App Router API Routes (TypeScript)
**목표**: `/api/device/*` 4개 라우트의 에러 응답 포맷을 일관되게 통일하여 클라이언트 에러 처리 단순화

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 4개 device API 라우트가 에러를 각자 다른 필드명/구조로 반환 → 클라이언트에서 에러 파싱 파편화 |
| **Solution** | 공통 에러 헬퍼 `lib/api/error.ts` 도입, 모든 라우트에서 `{ error: string, code?: string }` 포맷 통일 |
| **Function/UX Effect** | 클라이언트의 에러 처리 코드 단순화, 일관된 에러 메시지 표시 |
| **Core Value** | 유지보수성 향상, 향후 API 추가 시 일관성 보장 |

---

## 배경 및 문제 정의

### 현재 상태 (AS-IS)
gap-detector 분석 결과 "Error Response Consistency" 카테고리 75% WARN 감지:
- `activate`: `{ error: string }` ✅
- `auth`: `{ error: string }` ✅
- `config`: HTTP 상태만 반환, 에러 본문 없는 경우 있음 ⚠️
- `heartbeat`: 일부 경로에서 에러 본문 구조 불일치 ⚠️

### 목표 상태 (TO-BE)
모든 `/api/device/*` 에러 응답:
```json
{
  "error": "ERROR_CODE",
  "message": "사람이 읽을 수 있는 설명 (선택)"
}
```
HTTP 상태코드 사용 규칙:
- 400: 잘못된 요청 (파라미터 누락 등)
- 401: 인증 실패 (토큰 없음/만료)
- 403: 권한 없음
- 404: 리소스 없음
- 500: 서버 내부 오류

---

## 핵심 기능 요구사항

### FR-01. 공통 에러 헬퍼 생성
```typescript
// lib/api/error.ts
export function apiError(status: number, code: string, message?: string): Response
```

### FR-02. activate 라우트 적용
- 기존 에러 반환을 헬퍼로 교체
- 에러 코드 상수화: `INVALID_CODE`, `ALREADY_ACTIVATED`, `SERVER_ERROR`

### FR-03. auth 라우트 적용
- 에러 코드: `INVALID_CREDENTIALS`, `TERMINAL_INACTIVE`, `SERVER_ERROR`

### FR-04. config 라우트 적용
- 에러 코드: `UNAUTHORIZED`, `TERMINAL_NOT_FOUND`, `SERVER_ERROR`
- 빈 본문 반환 케이스 → 명시적 에러 JSON

### FR-05. heartbeat 라우트 적용
- 에러 코드: `UNAUTHORIZED`, `TERMINAL_NOT_FOUND`, `SERVER_ERROR`

### FR-06. 클라이언트 측 타입 반영
- `types/online.ts`에 `ApiErrorResponse` 인터페이스 추가
- `lib/onlineSync.ts`의 에러 처리 코드 업데이트

---

## 구현 범위

```
lib/api/
  error.ts        — 신규: 공통 에러 헬퍼

app/api/device/
  activate/route.ts  — 에러 포맷 통일
  auth/route.ts      — 에러 포맷 통일
  config/route.ts    — 에러 포맷 통일
  heartbeat/route.ts — 에러 포맷 통일

types/online.ts    — ApiErrorResponse 타입 추가
```

---

## 구현 우선순위

| 순서 | 항목 | 중요도 |
|------|------|--------|
| 1 | `lib/api/error.ts` 헬퍼 생성 | 필수 |
| 2 | config / heartbeat 라우트 수정 | 필수 |
| 3 | activate / auth 라우트 수정 | 높음 |
| 4 | `types/online.ts` 타입 추가 | 중간 |
| 5 | `lib/onlineSync.ts` 에러 처리 업데이트 | 중간 |

---

## 성공 기준

- [ ] 모든 `/api/device/*` 에러 응답이 `{ error: string }` 포맷
- [ ] 에러 코드 상수 문서화 (주석)
- [ ] TypeScript 오류 없음
- [ ] 기존 기능 동작 유지 (활성화, 인증, 설정 폴링, heartbeat)

---

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 클라이언트 에러 파싱 코드 파편화 | 일부 에러 처리 누락 | `onlineSync.ts` 에러 처리 함께 수정 |
| 기존 에러 메시지 변경 | UI 텍스트 불일치 | 에러 코드 → 메시지 매핑은 클라이언트에서 처리 |

---

## 다음 단계

1. [ ] `/pdca design error-response-unify`
2. [ ] 구현 (소규모, 1-2시간 예상)
3. [ ] `/pdca analyze error-response-unify`

---

## 버전 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 0.1 | 2026-03-24 | 초안 작성 (기술 부채 해소 목적) |
