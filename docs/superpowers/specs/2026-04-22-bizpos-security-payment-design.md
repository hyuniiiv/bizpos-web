# BIZPOS Web — 보안 강화 및 서버사이드 결제 통합 설계

**작성일:** 2026-04-22  
**상태:** 승인됨  
**범위:** 보안 패치 (C/H/M급) + 서버사이드 결제 완전 통합 + 코드 품질 + 단말기 헬스 보완

---

## 1. 배경 및 목적

코드 리뷰를 통해 발견된 보안 취약점과 구조적 개선 사항을 해결한다.

핵심 방향:
- 결제 암호화 키(`encKey`, `onlineAK`)를 단말기(클라이언트)에 전달하지 않는다
- `X-Internal-Key` 패턴을 terminal JWT Bearer 인증으로 전환한다
- 오프라인 결제는 관리자가 명시적으로 오프라인 모드를 설정한 단말기에서만 동작한다 (자동 전환 없음)

---

## 2. Section 1 — 보안 패치

### 2-1. `/api/settings` 인증 추가 (C-1)

**문제:** GET/POST 모두 인증 없이 `data/settings.json`을 읽고 씀.

**수정:** `requireTerminalAuth()`를 게이트로 추가.

```ts
// app/api/settings/route.ts
export async function GET(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error
  // ...
}
```

### 2-2. SSE 엔드포인트 CORS + 인증 (C-2)

**문제:** `Access-Control-Allow-Origin: *` + 인증 없음.

**수정:**
- `requireTerminalAuth()` 게이트 추가
- CORS를 `process.env.NEXT_PUBLIC_APP_URL`로 제한

### 2-3. `NEXT_PUBLIC_INTERNAL_POS_KEY` 제거 (C-3)

**문제:** 내부 API 키가 `NEXT_PUBLIC_` prefix로 브라우저 번들에 노출됨.

**영향 파일 (7개):**
- `app/admin/page.tsx`
- `app/admin/transactions/page.tsx`
- `app/pos/page.tsx`
- `app/pos/admin/page.tsx`
- `components/pos/RealTimeDashboard.tsx`
- `components/pos/screens/KioskScreen.tsx`
- `components/pos/screens/PosScreen.tsx`

**수정:** 모든 `X-Internal-Key` 헤더를 `Authorization: Bearer {terminalJWT}` 로 교체.  
해당 API Route들은 `INTERNAL_POS_KEY` 검증 대신 `requireTerminalAuth()`로 전환.

`.env.example`에서 `NEXT_PUBLIC_INTERNAL_POS_KEY` 제거, `INTERNAL_POS_KEY`만 유지.

### 2-4. JWT 만료 단축 + 자동 갱신 (H-1)

**변경:** 30일 → 7일

**자동 갱신 플로우:**
1. heartbeat 응답에 `tokenExpiresAt` 포함
2. 단말기 클라이언트가 만료 24시간 전 감지
3. `POST /api/device/token/refresh` (Bearer JWT 인증) 호출
4. 새 토큰 발급 → `localStorage` 갱신 (사용자 인지 불필요)
5. 단말기가 7일 이상 꺼진 경우에만 재로그인 필요

```ts
// lib/terminal/jwt.ts
.setExpirationTime('7d')  // 30d → 7d
```

### 2-5. Rate Limiting (H-2)

**대상 엔드포인트:**
- `POST /api/device/auth` — 비밀번호 브루트포스 방지
- `POST /api/device/activate` — 활성화 코드 대입 방지

**구현:** 서버 메모리 기반 rate limiter (IP당 5회/15분)  
Electron 로컬 환경이므로 외부 서비스(Upstash 등) 불필요.

```ts
// lib/api/rateLimit.ts
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string, limit = 5, windowMs = 15 * 60 * 1000): boolean {
  // ...
}
```

### 2-6. 인증 응답에서 결제 키 제거 (H-3)

**수정 파일:**
- `app/api/device/auth/route.ts` — `merchantKey` 블록 완전 제거
- `app/api/device/activate/route.ts` — `merchantKey` 블록 완전 제거

**제거 후 응답 구조:**
```ts
return NextResponse.json({
  terminalId: terminal.id,
  termId: terminal.term_id,
  accessToken,
  merchantId: terminal.merchant_id,
  config: configRow?.config ?? null,
  configVersion: configRow?.version ?? 0,
  // merchantKey 없음
})
```

---

## 3. Section 2 — 서버사이드 결제 완전 통합

### 3-1. 결제 키 로컬 저장 제거 (2단계 배포)

**Phase 4a — 클라이언트 선배포:**

`ActivationScreen.tsx`에 방어 코드 추가 후 클라이언트 먼저 배포한다.
electron-updater 자동 업데이트로 모든 단말기에 적용된 것을 확인한 뒤 Phase 4b로 진행.

```ts
// components/pos/ActivationScreen.tsx — Phase 4a
// 구 서버(merchantKey 있음)와 신 서버(없음) 모두 안전하게 처리
if (data.merchantKey) {
  // 구 서버 응답 호환 — 저장하지 않음 (이후 서버에서 제거되므로 무시)
}
// merchantKey 없음이 정상 상태
```

`settingsStore`의 `encKey`, `onlineAK` 필드 제거.  
`app/pos/admin/page.tsx` 키 표시 UI 2개 필드 제거.

**Phase 4b — 서버 후배포 (4a 완료 확인 후):**

`app/api/device/auth/route.ts`, `app/api/device/activate/route.ts`에서 `merchantKey` 블록 제거.

### 3-2. 결제 플로우 (온라인 모드)

변경되는 것: **인증 방식만**. 결제 처리 로직은 기존 그대로.

```
[변경 전]
POS → X-Internal-Key: NEXT_PUBLIC_KEY → /api/payment/approve

[변경 후]
POS → Authorization: Bearer {terminalJWT} → /api/payment/approve
```

`getBizplayClientForTerminal()`, `bizplay.approve()` 등 서버 내부 로직은 수정 없음.

### 3-3. 오프라인 결제 플로우 (명시적 오프라인 모드 단말기만)

**원칙:** 네트워크 실패 시 자동 오프라인 전환 없음.  
관리자가 `input_policy.mode = 'offline'`으로 명시 설정한 단말기만 오프라인 결제 진행.  
→ 의도치 않은 오프라인 거래 발생 방지.

```
[오프라인 모드 단말기]
바코드 스캔
    ↓
IndexedDB에 PendingPaymentRecord 저장
{
  merchantOrderID, merchantOrderDt,
  termId, barcodeInfo, barcodeType,
  productName, totalAmount, savedAt
}
    ↓
화면: "오프라인 결제 기록됨"

[동기화 시]
관리자 수동 실행 또는 모드 전환 시
    ↓
POST /api/payment/offline (Bearer JWT 인증)
{ records: PendingPaymentRecord[] }
    ↓
서버: DB에서 키 조회 → bizplay.syncOffline() → 거래 확정
```

**`txSync.ts` 역할 명확화:**
- 오프라인 모드 단말기 전용 큐 관리
- flush 목적지: `/api/payment/offline` (기존 `/api/transactions/batch` 연결 제거)
- 온라인 모드 단말기는 `txSync.ts` 미사용

---

## 4. Section 3 — 코드 품질 + 단말기 헬스 보완

### 4-1. `any` 타입 제거

**파일:** `app/api/transactions/route.ts:119,125,127`  
**수정:** `any` → `TxPayload` 인터페이스 명시

### 4-2. `data/` 경로 추상화

**현재:**
```ts
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json')
```

**변경:**
```ts
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
```

`.env.example`에 `DATA_DIR` 항목 추가.

### 4-3. 미사용 의존성 제거

```bash
pnpm remove socket.io socket.io-client
```

### 4-4. pg_cron 독립 스케줄 (단말기 헬스 보완)

**문제:** `check_terminal_health()`가 heartbeat 수신 시에만 호출됨.  
서버 재시작 후 모든 단말기가 침묵하면 `online` 상태 고착 가능.

**수정:** `mark_stale_terminals_offline()` 을 `pg_cron`으로 1분마다 독립 실행.

```sql
-- supabase/migrations/20260422000001_pg_cron_terminal_health.sql
SELECT cron.schedule(
  'mark-stale-terminals',
  '* * * * *',
  'SELECT mark_stale_terminals_offline()'
);
```

> 전제: Supabase 대시보드에서 `pg_cron` 익스텐션 활성화 필요.  
> `mark_stale_terminals_offline()` 함수는 기존 `schema.sql`에 이미 존재.

---

## 5. 변경되지 않는 것

| 파일 | 이유 |
|---|---|
| `lib/payment/bizplay.ts` | 서버 전용, 수정 불필요 |
| `lib/payment/getBizplayClient.ts` | 그대로 유지 |
| `lib/payment/crypto.ts` | PG 규격 (Zero IV 포함), 수정 불필요 |
| `app/api/payment/approve/route.ts` (결제 로직) | 인증 방식만 변경 |
| `app/api/payment/offline/route.ts` | 수정 없음, 연결만 변경 |
| `lib/terminal/auth.ts` | 기존 헬퍼 그대로 재사용 확대 |
| `supabase/schema.sql` (함수) | pg_cron 스케줄만 추가 |

---

## 6. 구현 순서 (Phase)

| Phase | 내용 | 위험도 |
|---|---|---|
| 1 | Rate limiting + `/api/settings` 인증 + SSE CORS 수정 | 낮음 |
| 2 | JWT 7일 단축 + token refresh 엔드포인트 + heartbeat 갱신 로직 | 중간 |
| 3 | `NEXT_PUBLIC_INTERNAL_POS_KEY` 제거 + Bearer JWT 전환 (7개 파일) | 중간 |
| 4a | ActivationScreen.tsx 방어 코드 + settingsStore `encKey`/`onlineAK` 제거 → 클라이언트 먼저 배포 후 electron-updater 자동 업데이트 완료 대기 | 낮음 |
| 4b | auth/activate 응답에서 `merchantKey` 블록 제거 → 서버 배포 (4a 완료 확인 후) | 낮음 |
| 5 | `txSync.ts` 오프라인 모드 명확화 + flush 경로 수정 | 중간 |
| 6 | 코드 품질 (`any` 제거, `DATA_DIR`, socket.io 제거) | 낮음 |
| 7 | pg_cron 마이그레이션 추가 | 낮음 |
