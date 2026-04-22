# BIZPOS Security & Payment Consolidation 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 보안 취약점(C-1~H-3) 전체 해결 + 결제 암호화 키를 서버에서만 관리하도록 통합

**Architecture:** 단말기 JWT Bearer 인증을 모든 내부 API 경로에 통일 적용. `X-Internal-Key` 패턴 완전 제거. 결제 키(`encKey`/`onlineAK`)는 서버 DB에서만 조회하며 클라이언트에 전달하지 않음. 오프라인 결제는 `input_policy.mode = 'offline'` 단말기에서만 허용 (네트워크 실패 시 자동 전환 없음).

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, jose (JWT), bcryptjs, Zustand, Electron

---

## 파일 변경 지도

### 신규 생성
- `lib/api/rateLimit.ts` — IP 기반 메모리 rate limiter
- `app/api/device/token/refresh/route.ts` — JWT 갱신 엔드포인트

### 수정
- `lib/terminal/jwt.ts` — 만료 30d → 7d
- `app/api/device/auth/route.ts` — rate limit 적용, merchantKey 제거 (Phase 4b)
- `app/api/device/activate/route.ts` — rate limit 적용, merchantKey 제거 (Phase 4b)
- `app/api/device/heartbeat/route.ts` — 응답에 tokenExpiresAt 포함
- `app/api/settings/route.ts` — requireTerminalAuth 게이트
- `app/api/transactions/realtime/route.ts` — CORS 제한 + requireTerminalAuth
- `app/api/payment/approve/route.ts` — X-Internal-Key → requireTerminalAuth
- `app/api/payment/cancel/route.ts` — 동일
- `app/api/payment/cancel-request/route.ts` — 동일
- `app/api/payment/result/route.ts` — 동일
- `app/api/terminals/route.ts` — 동일
- `app/api/transactions/route.ts` — 동일 + any 타입 제거 + DATA_DIR
- `app/pos/page.tsx` — X-Internal-Key → Bearer JWT
- `app/pos/admin/page.tsx` — 동일 + 키 표시 UI 제거
- `app/admin/page.tsx` — 동일
- `app/admin/transactions/page.tsx` — 동일
- `components/pos/RealTimeDashboard.tsx` — 동일
- `components/pos/screens/KioskScreen.tsx` — 동일
- `components/pos/screens/PosScreen.tsx` — 동일
- `components/pos/ActivationScreen.tsx` — merchantKey 저장 로직 제거
- `lib/store/settingsStore.ts` — encKey, onlineAK 필드 제거
- `lib/onlineSync.ts` — 자동 token refresh 로직 추가
- `lib/txSync.ts` — 오프라인 모드 전용으로 역할 명확화
- `.env.example` — NEXT_PUBLIC_INTERNAL_POS_KEY 제거, DATA_DIR 추가
- `package.json` — socket.io 제거

### 신규 마이그레이션
- `supabase/migrations/20260422000001_pg_cron_terminal_health.sql`

---

## Phase 1: 저위험 보안 패치

### Task 1: Rate Limiter 유틸리티

**Files:**
- Create: `lib/api/rateLimit.ts`

- [ ] **Step 1: 파일 생성**

```ts
// lib/api/rateLimit.ts
interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

export function getRateLimitKey(req: { headers: { get: (k: string) => string | null } }, suffix: string): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
  return `${ip}:${suffix}`
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd D:/BIZPOS_WEB/bizpos-web && pnpm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` 또는 기존과 동일한 오류 (새 오류 없어야 함)

- [ ] **Step 3: 커밋**

```bash
git add lib/api/rateLimit.ts
git commit -m "feat: add in-memory rate limiter utility"
```

---

### Task 2: /api/device/auth Rate Limit 적용

**Files:**
- Modify: `app/api/device/auth/route.ts`

- [ ] **Step 1: import 추가 및 rate limit 적용**

`app/api/device/auth/route.ts` 상단에 import 추가:

```ts
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit'
```

`POST` 핸들러 첫 줄에 추가 (try 블록 전):

```ts
export async function POST(req: NextRequest) {
  // Rate limit: IP당 5회/15분
  const rl = checkRateLimit(getRateLimitKey(req, 'device-auth'))
  if (!rl.allowed) {
    return apiError('RATE_LIMITED', `너무 많은 시도입니다. ${rl.retryAfter}초 후 다시 시도하세요`, 429)
  }

  let terminalAccountId: string | undefined
  // ... 이하 기존 코드 유지
```

- [ ] **Step 2: 검증 — 6회 연속 요청 시 429 확인**

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/device/auth \
    -H "Content-Type: application/json" \
    -d '{"terminalAccountId":"test","password":"wrong"}'
done
```

Expected: 처음 5개 `401`, 6번째 `429`

- [ ] **Step 3: 커밋**

```bash
git add app/api/device/auth/route.ts
git commit -m "feat: add rate limiting to device auth endpoint"
```

---

### Task 3: /api/device/activate Rate Limit 적용

**Files:**
- Modify: `app/api/device/activate/route.ts`

- [ ] **Step 1: import 추가 및 rate limit 적용**

파일 상단:
```ts
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit'
```

`POST` 핸들러 첫 줄:
```ts
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request, 'device-activate'), 5, 15 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  let activationCode: string | undefined
  // ... 이하 기존 코드 유지
```

- [ ] **Step 2: 검증**

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/device/activate \
    -H "Content-Type: application/json" \
    -d '{"activationCode":"XXXXXX"}'
done
```

Expected: 처음 5개 `404`, 6번째 `429`

- [ ] **Step 3: 커밋**

```bash
git add app/api/device/activate/route.ts
git commit -m "feat: add rate limiting to device activate endpoint"
```

---

### Task 4: /api/settings 인증 게이트

**Files:**
- Modify: `app/api/settings/route.ts`

- [ ] **Step 1: requireTerminalAuth 적용**

파일 전체를 다음으로 교체:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireTerminalAuth } from '@/lib/terminal/auth'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

async function readSettings(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeSettings(data: Record<string, string>): Promise<void> {
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true })
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error
  const settings = await readSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error
  const body = await req.json()
  const current = await readSettings()
  const updated = { ...current, ...body }
  await writeSettings(updated)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: 인증 없이 접근 시 401 확인**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/settings
```

Expected: `401`

- [ ] **Step 3: 커밋**

```bash
git add app/api/settings/route.ts
git commit -m "fix(security): add terminal auth gate to /api/settings"
```

---

### Task 5: SSE 엔드포인트 CORS 제한 + 인증

**Files:**
- Modify: `app/api/transactions/realtime/route.ts`

- [ ] **Step 1: requireTerminalAuth + CORS 수정**

파일 전체를 다음으로 교체:

```ts
import { NextRequest } from 'next/server'
import { transactionEmitter } from '../../payment/approve/route'
import { requireTerminalAuth } from '@/lib/terminal/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  const sessionId = crypto.randomUUID()
  const encoder = new TextEncoder()

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      const listeners = transactionEmitter.get(sessionId) ?? []
      const onTransaction = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // 클라이언트 연결 종료 시 무시
        }
      }
      listeners.push(onTransaction)
      transactionEmitter.set(sessionId, listeners)

      req.signal.addEventListener('abort', () => {
        transactionEmitter.delete(sessionId)
        try { controller.close() } catch { /* 이미 닫힘 */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': allowedOrigin,
    },
  })
}
```

- [ ] **Step 2: 인증 없이 접근 시 401 확인**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/transactions/realtime
```

Expected: `401`

- [ ] **Step 3: 커밋**

```bash
git add app/api/transactions/realtime/route.ts
git commit -m "fix(security): restrict SSE endpoint CORS and add auth"
```

---

## Phase 2: JWT 단축 + 자동 갱신

### Task 6: JWT 만료 30d → 7d

**Files:**
- Modify: `lib/terminal/jwt.ts`

- [ ] **Step 1: 만료 기간 변경**

`lib/terminal/jwt.ts` 16번째 줄:
```ts
// 변경 전
.setExpirationTime('30d')

// 변경 후
.setExpirationTime('7d')
```

- [ ] **Step 2: 빌드 확인**

```bash
pnpm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/terminal/jwt.ts
git commit -m "fix(security): reduce terminal JWT expiry from 30d to 7d"
```

---

### Task 7: /api/device/token/refresh 엔드포인트

**Files:**
- Create: `app/api/device/token/refresh/route.ts`

- [ ] **Step 1: 파일 생성**

```ts
// app/api/device/token/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import { createTerminalJWT } from '@/lib/terminal/jwt'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError } from '@/lib/api/error'

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  const { terminalId, merchantId, termId, merchantKeyId } = auth.payload

  // 단말기가 여전히 유효한지 확인
  const supabase = createAdminClient()
  const { data: terminal } = await supabase
    .from('terminals')
    .select('status')
    .eq('id', terminalId)
    .single()

  if (!terminal || terminal.status === 'inactive') {
    return apiError('TERMINAL_INACTIVE', '비활성 단말기입니다', 403)
  }

  const accessToken = await createTerminalJWT({ terminalId, merchantId, termId, merchantKeyId })
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  return NextResponse.json({ accessToken, expiresAt })
}
```

- [ ] **Step 2: 유효한 JWT로 갱신 확인**

```bash
# 기존 토큰으로 갱신 시도 (TOKEN을 실제 단말기 JWT로 교체)
curl -s -X POST http://localhost:3000/api/device/token/refresh \
  -H "Authorization: Bearer TOKEN" | jq '.expiresAt'
```

Expected: 7일 후 ISO timestamp

- [ ] **Step 3: 커밋**

```bash
git add app/api/device/token/refresh/route.ts
git commit -m "feat: add JWT refresh endpoint for terminal auto-renewal"
```

---

### Task 8: Heartbeat 응답에 tokenExpiresAt 포함

**Files:**
- Modify: `app/api/device/heartbeat/route.ts`

- [ ] **Step 1: JWT 페이로드에서 만료 시간 추출 후 응답에 포함**

`app/api/device/heartbeat/route.ts` 전체를 다음으로 교체:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import { verifyTerminalJWT } from '@/lib/terminal/jwt'

export async function POST(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload
  const { status } = await request.json().catch(() => ({ status: 'online' }))

  const supabase = createAdminClient()

  await supabase
    .from('terminals')
    .update({
      status: status ?? 'online',
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', terminalId)

  Promise.resolve(supabase.rpc('check_terminal_health')).then(() => {}).catch(() => {})

  // 토큰 만료 시간 전달 (클라이언트 자동 갱신용)
  const token = request.headers.get('Authorization')?.slice(7) ?? ''
  let tokenExpiresAt: string | null = null
  try {
    const payload = await verifyTerminalJWT(token)
    const exp = (payload as unknown as { exp?: number }).exp
    if (exp) tokenExpiresAt = new Date(exp * 1000).toISOString()
  } catch {
    // 만료 정보 없어도 heartbeat는 성공
  }

  return NextResponse.json({ ok: true, tokenExpiresAt })
}
```

- [ ] **Step 2: heartbeat 응답에 tokenExpiresAt 포함 확인**

```bash
curl -s -X POST http://localhost:3000/api/device/heartbeat \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"online"}' | jq '.tokenExpiresAt'
```

Expected: ISO timestamp (null이 아닌 값)

- [ ] **Step 3: 커밋**

```bash
git add app/api/device/heartbeat/route.ts
git commit -m "feat: include tokenExpiresAt in heartbeat response"
```

---

### Task 9: 클라이언트 자동 토큰 갱신 로직

**Files:**
- Modify: `lib/onlineSync.ts`

- [ ] **Step 1: heartbeat에서 tokenExpiresAt 수신 후 24시간 전 자동 갱신**

`lib/onlineSync.ts`의 `startHeartbeat()` 함수를 다음으로 교체:

```ts
function startHeartbeat() {
  if (heartbeatTimer) return

  const send = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token || !navigator.onLine) return

    try {
      const res = await fetch('/api/device/heartbeat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'online' }),
      })

      if (res.ok) {
        const data = await res.json()
        // 만료 24시간 전이면 자동 갱신
        if (data.tokenExpiresAt) {
          const expiresAt = new Date(data.tokenExpiresAt).getTime()
          const oneDayMs = 24 * 60 * 60 * 1000
          if (expiresAt - Date.now() < oneDayMs) {
            await refreshToken(token)
          }
        }
      }
    } catch {
      // heartbeat 실패 무시
    }
  }

  send()
  heartbeatTimer = setInterval(send, 30_000)
}

async function refreshToken(currentToken: string): Promise<void> {
  try {
    const res = await fetch('/api/device/token/refresh', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` },
    })
    if (res.ok) {
      const data = await res.json()
      // onlineSync 자체 토큰 갱신
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
      // Zustand persist 스토어('bizpos-settings')도 동기화
      // React 컴포넌트(app/pos/page.tsx 등)가 deviceToken을 Zustand에서 읽기 때문에 필요
      const raw = localStorage.getItem('bizpos-settings')
      if (raw) {
        try {
          const zustandState = JSON.parse(raw)
          if (zustandState?.state) {
            zustandState.state.deviceToken = data.accessToken
            localStorage.setItem('bizpos-settings', JSON.stringify(zustandState))
          }
        } catch {
          // Zustand 상태 파싱 실패 시 무시 (페이지 리로드 시 자동 복구)
        }
      }
    }
  } catch {
    // 갱신 실패 시 다음 heartbeat에서 재시도
  }
}
```

- [ ] **Step 2: 빌드 확인**

```bash
pnpm run build 2>&1 | grep -E "error TS|✓"
```

Expected: TypeScript 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/onlineSync.ts
git commit -m "feat: auto-refresh terminal JWT before expiry via heartbeat"
```

---

## Phase 3: X-Internal-Key → Bearer JWT 전환

### Task 10: API Route 6개 인증 방식 교체

**Files:**
- Modify: `app/api/payment/approve/route.ts`
- Modify: `app/api/payment/cancel/route.ts`
- Modify: `app/api/payment/cancel-request/route.ts`
- Modify: `app/api/payment/result/route.ts`
- Modify: `app/api/terminals/route.ts`
- Modify: `app/api/transactions/route.ts`

- [ ] **Step 1: app/api/payment/approve/route.ts 교체**

기존:
```ts
const internalKey = process.env.INTERNAL_POS_KEY
if (!internalKey || req.headers.get('X-Internal-Key') !== internalKey) {
  return NextResponse.json({ code: 'AUTH', msg: '인증 오류' }, { status: 401 })
}
```

교체:
```ts
import { requireTerminalAuth } from '@/lib/terminal/auth'

// POST 핸들러 첫 줄
const auth = await requireTerminalAuth(req)
if ('error' in auth) return auth.error
```

- [ ] **Step 2: app/api/payment/cancel/route.ts 동일 교체**

기존 `INTERNAL_POS_KEY` 블록을:
```ts
import { requireTerminalAuth } from '@/lib/terminal/auth'
// ...
const auth = await requireTerminalAuth(req)
if ('error' in auth) return auth.error
```

- [ ] **Step 3: app/api/payment/cancel-request/route.ts 동일 교체**

Step 2와 동일한 패턴으로 교체.

- [ ] **Step 4: app/api/payment/result/route.ts 동일 교체**

Step 2와 동일한 패턴으로 교체.

- [ ] **Step 5: app/api/terminals/route.ts 동일 교체**

기존:
```ts
const internalKey = process.env.INTERNAL_POS_KEY
if (!internalKey || req.headers.get('X-Internal-Key') !== internalKey) {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
}
```

교체:
```ts
import { requireTerminalAuth } from '@/lib/terminal/auth'
// ...
const auth = await requireTerminalAuth(req)
if ('error' in auth) return auth.error
```

- [ ] **Step 6: app/api/transactions/route.ts GET/POST 교체**

GET 핸들러:
```ts
export async function GET(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error
  // 기존 로직 유지 (INTERNAL_POS_KEY 검증 블록 제거)
```

POST 핸들러도 동일하게 교체. (파일 상단 `requireTerminalAuth` import 추가)

- [ ] **Step 7: 빌드 확인**

```bash
pnpm run build 2>&1 | grep -E "error TS|✓ Compiled"
```

Expected: 컴파일 성공

- [ ] **Step 8: 커밋**

```bash
git add app/api/payment/approve/route.ts \
        app/api/payment/cancel/route.ts \
        app/api/payment/cancel-request/route.ts \
        app/api/payment/result/route.ts \
        app/api/terminals/route.ts \
        app/api/transactions/route.ts
git commit -m "refactor(security): replace X-Internal-Key with terminal JWT auth on API routes"
```

---

### Task 11: 클라이언트 7개 파일 — X-Internal-Key → Bearer JWT

**Files:**
- Modify: `app/pos/page.tsx`
- Modify: `app/pos/admin/page.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/transactions/page.tsx`
- Modify: `components/pos/RealTimeDashboard.tsx`
- Modify: `components/pos/screens/KioskScreen.tsx`
- Modify: `components/pos/screens/PosScreen.tsx`

**원칙:** 각 파일에서 `process.env.NEXT_PUBLIC_INTERNAL_POS_KEY` 를 `useSettingsStore`의 `deviceToken`으로 교체.

- [ ] **Step 1: app/pos/page.tsx 수정**

파일 상단에 import 추가:
```ts
import { useSettingsStore } from '@/lib/store/settingsStore'
```

컴포넌트 내부에 토큰 읽기 추가:
```ts
const deviceToken = useSettingsStore(state => state.deviceToken)
```

파일 내 모든 `'X-Internal-Key': process.env.NEXT_PUBLIC_INTERNAL_POS_KEY ?? ''` 를:
```ts
'Authorization': `Bearer ${deviceToken ?? ''}`
```

- [ ] **Step 2: app/pos/admin/page.tsx 동일 패턴 적용**

Step 1과 동일. `useSettingsStore` import + `deviceToken` 변수 + 헤더 교체.

- [ ] **Step 3: app/admin/page.tsx 동일 패턴 적용**

Step 1과 동일.

- [ ] **Step 4: app/admin/transactions/page.tsx 동일 패턴 적용**

Step 1과 동일.

- [ ] **Step 5: components/pos/RealTimeDashboard.tsx 동일 패턴 적용**

Step 1과 동일. (이미 `useSettingsStore`를 사용 중일 수 있으므로 import 중복 확인)

- [ ] **Step 6: components/pos/screens/KioskScreen.tsx 동일 패턴 적용**

Step 1과 동일.

- [ ] **Step 7: components/pos/screens/PosScreen.tsx 동일 패턴 적용**

Step 1과 동일.

- [ ] **Step 8: TypeScript 빌드 확인**

```bash
pnpm run build 2>&1 | grep -E "error TS|✓ Compiled"
```

Expected: 컴파일 성공, `NEXT_PUBLIC_INTERNAL_POS_KEY` 참조 없음

- [ ] **Step 9: 커밋**

```bash
git add app/pos/page.tsx app/pos/admin/page.tsx \
        app/admin/page.tsx app/admin/transactions/page.tsx \
        components/pos/RealTimeDashboard.tsx \
        components/pos/screens/KioskScreen.tsx \
        components/pos/screens/PosScreen.tsx
git commit -m "refactor(security): replace X-Internal-Key with Bearer JWT in client components"
```

---

### Task 12: .env 파일 정리

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: NEXT_PUBLIC_INTERNAL_POS_KEY 제거, DATA_DIR 추가**

`.env.example`에서 다음 줄 제거:
```
NEXT_PUBLIC_INTERNAL_POS_KEY=your-internal-api-key-here
```

다음 줄 추가 (INTERNAL_POS_KEY 항목 뒤에):
```
# 로컬 파일 저장 디렉토리 (기본값: {프로젝트루트}/data)
# Electron 환경에서 실행 파일 위치에 맞게 조정 가능
DATA_DIR=
```

- [ ] **Step 2: .env.local에서도 제거**

`.env.local`에서 `NEXT_PUBLIC_INTERNAL_POS_KEY` 줄 제거. (실제 값이므로 직접 수정)

- [ ] **Step 3: 코드베이스에 NEXT_PUBLIC_INTERNAL_POS_KEY 잔재 없음 확인**

```bash
grep -r "NEXT_PUBLIC_INTERNAL_POS_KEY" D:/BIZPOS_WEB/bizpos-web --include="*.ts" --include="*.tsx" | grep -v ".next"
```

Expected: 결과 없음

- [ ] **Step 4: 커밋**

```bash
git add .env.example
git commit -m "fix(security): remove NEXT_PUBLIC_INTERNAL_POS_KEY, add DATA_DIR env var"
```

---

## Phase 4a: 클라이언트 선배포 — merchantKey 제거 (안전한 분리 배포)

### Task 13: ActivationScreen.tsx 방어 코드 + settingsStore 키 필드 제거

**Files:**
- Modify: `components/pos/ActivationScreen.tsx`
- Modify: `lib/store/settingsStore.ts`

- [ ] **Step 1: ActivationScreen.tsx — merchantKey 저장 로직 제거**

`components/pos/ActivationScreen.tsx` 37~41번째 줄의 merchantKey 블록 제거:

```ts
// 제거할 코드:
...(data.merchantKey ? {
  mid: data.merchantKey.mid,
  encKey: data.merchantKey.encKey,
  onlineAK: data.merchantKey.onlineAK,
} : {}),
```

제거 후 `updateConfig` 호출:
```ts
await updateConfig({
  termId: data.termId ?? '',
  ...(data.name ? { termName: data.name } : {}),
  ...(data.corner ? { corner: data.corner } : {}),
  ...cfg,
})
```

- [ ] **Step 2: settingsStore.ts — encKey, onlineAK, mid 필드 제거**

`lib/store/settingsStore.ts`의 config 초기값에서 제거:
```ts
// 제거:
onlineAK: '',
mid: '',
encKey: '',
```

`DeviceConfig` 타입(`types/menu.ts` 또는 해당 위치)에서도 동일 필드 제거.

- [ ] **Step 3: TypeScript 빌드로 잔여 참조 확인**

```bash
pnpm run build 2>&1 | grep -E "error TS|encKey|onlineAK"
```

Expected: 관련 오류 없음 (만약 있다면 해당 파일에서 필드 참조 제거)

- [ ] **Step 4: 커밋 (클라이언트 선배포 커밋)**

```bash
git add components/pos/ActivationScreen.tsx lib/store/settingsStore.ts
git commit -m "feat(phase4a): remove merchantKey storage from client - deploy before server change"
```

> **배포 주의:** 이 커밋을 Electron 앱으로 빌드·배포 후, electron-updater 자동 업데이트가 모든 단말기에 적용됐는지 확인한 뒤 Task 14(서버 변경)를 진행합니다.

---

### Task 14: POS 관리자 페이지 키 표시 UI 제거

**Files:**
- Modify: `app/pos/admin/page.tsx`

- [ ] **Step 1: onlineAK/encKey 표시 input 2개 제거**

`app/pos/admin/page.tsx` 510~514번째 줄의 키 표시 섹션 제거:

```tsx
// 제거할 블록:
<input readOnly type="password" ... value={config.onlineAK || ''} ... />
// ...
<label ...>암복호화 KEY (encKey)</label>
<input readOnly type="password" ... value={config.encKey || ''} ... />
```

- [ ] **Step 2: 빌드 확인**

```bash
pnpm run build 2>&1 | grep -E "error TS|✓"
```

- [ ] **Step 3: 커밋**

```bash
git add app/pos/admin/page.tsx
git commit -m "feat(phase4a): remove key display UI from POS admin page"
```

---

## Phase 4b: 서버 후배포 — merchantKey 응답 제거

> **전제:** Phase 4a 커밋이 모든 단말기에 배포 완료된 후 진행.

### Task 15: auth/activate 응답에서 merchantKey 제거

**Files:**
- Modify: `app/api/device/auth/route.ts`
- Modify: `app/api/device/activate/route.ts`

- [ ] **Step 1: app/api/device/auth/route.ts — merchantKey 조회 및 응답 블록 제거**

제거할 코드 (54~62번째 줄):
```ts
let merchantKey: { mid: string; enc_key: string; online_ak: string } | null = null
if (terminal.merchant_key_id) {
  const { data: mk } = await supabase
    .from('merchant_keys')
    .select('mid, enc_key, online_ak')
    .eq('id', terminal.merchant_key_id)
    .single()
  merchantKey = mk ?? null
}
```

응답에서 merchantKey 블록 제거 (93~100번째 줄):
```ts
// 제거:
merchantKey: merchantKey
  ? {
      id: terminal.merchant_key_id,
      mid: merchantKey.mid,
      encKey: merchantKey.enc_key,
      onlineAK: merchantKey.online_ak,
    }
  : null,
```

최종 응답:
```ts
return NextResponse.json({
  terminalId: terminal.id,
  termId: terminal.term_id,
  accessToken,
  merchantId: terminal.merchant_id,
  config: configRow?.config ?? null,
  configVersion: configRow?.version ?? 0,
})
```

- [ ] **Step 2: app/api/device/activate/route.ts — merchantKey 조회 및 응답 블록 제거**

제거할 코드 (64~79번째 줄):
```ts
let merchantKey = null
if (terminal.merchant_key_id) {
  const { data: mk } = await supabase
    .from('merchant_keys')
    .select('mid, enc_key, online_ak')
    .eq('id', terminal.merchant_key_id)
    .single()
  if (mk) {
    merchantKey = { ... }
  }
}
```

응답에서 `merchantKey,` 줄 제거.

- [ ] **Step 3: 응답에 merchantKey 없음 확인**

```bash
# 실제 활성화 코드가 없으므로 404가 나야 정상 (merchantKey 필드가 없어야 함)
curl -s -X POST http://localhost:3000/api/device/activate \
  -H "Content-Type: application/json" \
  -d '{"activationCode":"TEST00"}' | jq 'has("merchantKey")'
```

Expected: `false`

- [ ] **Step 4: 커밋 (서버 후배포 커밋)**

```bash
git add app/api/device/auth/route.ts app/api/device/activate/route.ts
git commit -m "feat(phase4b): remove merchantKey from auth/activate responses"
```

---

## Phase 5: txSync 오프라인 모드 역할 명확화

### Task 16: txSync flush를 /api/payment/offline으로 연결

**Files:**
- Modify: `lib/txSync.ts`

- [ ] **Step 1: TxPayload를 오프라인 결제 레코드 형식으로 정의하고 flush 경로 변경**

`lib/txSync.ts` 전체 교체:

```ts
/**
 * 오프라인 모드 단말기 전용 결제 큐 관리
 * - input_policy.mode = 'offline' 인 단말기만 사용
 * - 네트워크 실패 시 자동 전환 없음 (명시적 오프라인 모드만 해당)
 */

import { markPaymentSynced } from '@/lib/db/indexeddb'

const ACCESS_TOKEN_KEY = 'terminal_access_token'
const OFFLINE_QUEUE_KEY = 'tx_offline_queue'

export interface OfflinePaymentRecord {
  merchantOrderID: string
  merchantOrderDt: string
  termId: string
  barcodeInfo: string
  barcodeType: string
  productName: string
  totalAmount: number
  savedAt: string
}

function getAccessToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function getOfflineQueue(): OfflinePaymentRecord[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addToOfflineQueue(record: OfflinePaymentRecord): void {
  const queue = getOfflineQueue()
  queue.push(record)
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY)
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length
}

/**
 * 오프라인 큐를 /api/payment/offline으로 전송해 실제 결제 처리
 * 온라인 복귀 또는 관리자 수동 동기화 시 호출
 */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const token = getAccessToken()
  const queue = getOfflineQueue()

  if (!token || queue.length === 0) return { synced: 0, failed: 0 }

  try {
    const res = await fetch('/api/payment/offline', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: queue }),
    })

    if (res.ok) {
      const result = await res.json()
      clearOfflineQueue()
      await Promise.all(queue.map(r => markPaymentSynced(r.merchantOrderID)))
      return { synced: result.synced ?? queue.length, failed: 0 }
    }
  } catch {
    // 실패 시 큐 유지, 다음 시도에서 재전송
  }

  return { synced: 0, failed: queue.length }
}
```

- [ ] **Step 2: /api/payment/offline에 Bearer JWT 인증 추가**

`app/api/payment/offline/route.ts` 상단에 인증 게이트 추가:

```ts
import { requireTerminalAuth } from '@/lib/terminal/auth'

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  // 기존 로직 유지
```

- [ ] **Step 3: 빌드 확인**

```bash
pnpm run build 2>&1 | grep -E "error TS|✓"
```

- [ ] **Step 4: 커밋**

```bash
git add lib/txSync.ts app/api/payment/offline/route.ts
git commit -m "refactor: clarify offline queue as explicit offline-mode only, route to /api/payment/offline"
```

---

## Phase 6: 코드 품질

### Task 17: any 타입 제거 + DATA_DIR 추상화

**Files:**
- Modify: `app/api/transactions/route.ts`

- [ ] **Step 1: DATA_DIR 추상화**

파일 상단 `DATA_FILE` 정의 부분을:
```ts
// 변경 전
const DATA_FILE = path.join(process.cwd(), 'data', 'transactions.json')

// 변경 후
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'transactions.json')
```

- [ ] **Step 2: any 타입 제거 (119, 125, 127번째 줄)**

파일 상단에 로컬 타입 정의 추가:
```ts
interface StoredTransaction {
  approvedAt?: string
  createdAt?: string
  status: string
  amount?: number
  [key: string]: unknown
}
```

119번째 줄:
```ts
// 변경 전
filtered = filtered.filter((tx: any) => {

// 변경 후
filtered = filtered.filter((tx: StoredTransaction) => {
```

125, 127번째 줄 동일하게 `(tx: any)` → `(tx: StoredTransaction)` 교체.

- [ ] **Step 3: 빌드 확인**

```bash
pnpm run build 2>&1 | grep -E "error TS|✓"
```

- [ ] **Step 4: 커밋**

```bash
git add app/api/transactions/route.ts
git commit -m "refactor: remove any types and abstract DATA_DIR in transactions route"
```

---

### Task 18: socket.io 미사용 의존성 제거

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 제거**

```bash
cd D:/BIZPOS_WEB/bizpos-web && pnpm remove socket.io socket.io-client
```

- [ ] **Step 2: 잔여 import 없음 확인**

```bash
grep -r "socket\.io" D:/BIZPOS_WEB/bizpos-web --include="*.ts" --include="*.tsx" | grep -v ".next" | grep -v "node_modules"
```

Expected: 결과 없음

- [ ] **Step 3: 빌드 확인**

```bash
pnpm run build 2>&1 | grep -E "error|✓ Compiled"
```

- [ ] **Step 4: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: remove unused socket.io dependencies"
```

---

## Phase 7: pg_cron 단말기 헬스 스케줄

### Task 19: pg_cron 마이그레이션 추가

**Files:**
- Create: `supabase/migrations/20260422000001_pg_cron_terminal_health.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/20260422000001_pg_cron_terminal_health.sql
-- 전제: Supabase 대시보드 → Database → Extensions → pg_cron 활성화 필요

-- 기존 스케줄이 있으면 제거 후 재등록
SELECT cron.unschedule('mark-stale-terminals') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'mark-stale-terminals'
);

SELECT cron.schedule(
  'mark-stale-terminals',
  '* * * * *',
  $$SELECT mark_stale_terminals_offline()$$
);
```

- [ ] **Step 2: Supabase 대시보드에서 적용**

Supabase 대시보드 → SQL Editor에서 위 SQL 실행.  
또는 `supabase db push`로 마이그레이션 적용.

확인:
```sql
SELECT * FROM cron.job WHERE jobname = 'mark-stale-terminals';
```

Expected: 1개 행 반환

- [ ] **Step 3: 60초 후 online 단말기 offline 전환 확인**

Supabase 대시보드 → Table Editor → `terminals` 테이블에서 `last_seen_at`이 60초 이상 지난 단말기의 `status`가 `offline`으로 변경되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260422000001_pg_cron_terminal_health.sql
git commit -m "feat: add pg_cron schedule for independent terminal health check"
```

---

## 구현 완료 체크리스트

- [ ] Phase 1: Rate limiting (auth, activate), /api/settings 인증, SSE CORS
- [ ] Phase 2: JWT 7일, /api/device/token/refresh, heartbeat tokenExpiresAt, 자동 갱신
- [ ] Phase 3: X-Internal-Key 완전 제거 (서버 6개 + 클라이언트 7개), .env 정리
- [ ] Phase 4a: 클라이언트 배포 (ActivationScreen, settingsStore, POS admin UI)
- [ ] Phase 4b: 서버 배포 (auth/activate merchantKey 제거) — 4a 완료 후
- [ ] Phase 5: txSync 오프라인 모드 명확화
- [ ] Phase 6: any 타입, DATA_DIR, socket.io 제거
- [ ] Phase 7: pg_cron 마이그레이션

> **Phase 4 배포 순서 필수:** 4a (클라이언트) → electron-updater 업데이트 완료 확인 → 4b (서버)
