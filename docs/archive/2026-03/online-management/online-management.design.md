# [Design] online-management

## 개요
**Feature**: 온라인 단말기 관리 시스템
**Stack**: Vercel (Next.js) + Supabase (PostgreSQL + Auth + Realtime)
**Plan 참조**: `docs/01-plan/features/online-management.plan.md`

---

## 1. 아키텍처 설계

### 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js)                         │
│                                                             │
│  /app/dashboard/          관리자 대시보드 (웹 브라우저)       │
│  /app/api/device/         단말기 API (REST)                  │
│  /app/api/transactions/   거래내역 API                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Supabase Client
┌──────────────────────────────▼──────────────────────────────┐
│                    Supabase                                  │
│                                                             │
│  Auth     가맹점 계정 (email/password)                       │
│  Database PostgreSQL (merchants, terminals, transactions...) │
│  Realtime 설정 변경 push (terminals, terminal_configs)       │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ HTTP polling / Realtime WS
┌──────────────────────────────┴──────────────────────────────┐
│              Electron POS 단말기 (기존 앱)                   │
│                                                             │
│  lib/onlineSync.ts    서버 연동 레이어                       │
│  lib/configSync.ts    설정 동기화 (30초 폴링 or Realtime)    │
│  lib/txSync.ts        거래내역 서버 저장                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Supabase DB 스키마 (DDL)

### 2-1. merchants (가맹점)

```sql
CREATE TABLE merchants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  biz_no       text UNIQUE,
  merchant_id  text,                    -- PG 가맹점 코드
  created_at   timestamptz DEFAULT now()
);

-- 가맹점 소유자: auth.users와 연결
CREATE TABLE merchant_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'admin',  -- 'superadmin' | 'admin'
  created_at  timestamptz DEFAULT now(),
  UNIQUE (merchant_id, user_id)
);
```

### 2-2. terminals (단말기)

```sql
CREATE TABLE terminals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  term_id       text NOT NULL,           -- 2자리 단말기 ID (예: '01')
  name          text NOT NULL DEFAULT '',
  corner        text NOT NULL DEFAULT '',
  activation_code text UNIQUE,           -- 최초 활성화 코드 (6자리)
  access_token  text,                    -- JWT secret seed
  status        text NOT NULL DEFAULT 'offline',  -- 'online' | 'offline'
  last_seen_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (merchant_id, term_id)
);
```

### 2-3. terminal_configs (단말기 설정)

```sql
CREATE TABLE terminal_configs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id  uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  config       jsonb NOT NULL,           -- 전체 설정 JSON
  version      int NOT NULL DEFAULT 1,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_terminal_configs_terminal_id ON terminal_configs(terminal_id, version DESC);
```

### 2-4. transactions (거래내역)

```sql
CREATE TABLE transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id         uuid NOT NULL REFERENCES terminals(id),
  merchant_id         uuid NOT NULL REFERENCES merchants(id),
  merchant_order_id   text NOT NULL,
  menu_name           text NOT NULL DEFAULT '',
  amount              int NOT NULL,
  barcode_info        text DEFAULT '',
  payment_type        text NOT NULL,     -- 'qr' | 'barcode' | 'rfcard'
  status              text NOT NULL,     -- 'success' | 'cancelled'
  approved_at         timestamptz NOT NULL,
  synced              bool NOT NULL DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_transactions_merchant ON transactions(merchant_id, approved_at DESC);
CREATE INDEX idx_transactions_terminal ON transactions(terminal_id, approved_at DESC);
CREATE INDEX idx_transactions_unsynced ON transactions(synced) WHERE synced = false;
```

### 2-5. Row Level Security (RLS)

```sql
-- terminals: 해당 가맹점 관리자만 접근
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchants see own terminals"
  ON terminals FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );

-- transactions: 해당 가맹점 관리자만 조회
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchants see own transactions"
  ON transactions FOR SELECT
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );

-- 단말기는 service_role key로만 INSERT (API Route에서 처리)
CREATE POLICY "service role insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);  -- API Route에서 service_role 사용

-- terminal_configs: 가맹점 관리자 read/write
ALTER TABLE terminal_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchants manage configs"
  ON terminal_configs FOR ALL
  USING (
    terminal_id IN (
      SELECT t.id FROM terminals t
      JOIN merchant_users mu ON mu.merchant_id = t.merchant_id
      WHERE mu.user_id = auth.uid()
    )
  );
```

---

## 3. 환경변수

### .env.local (개발) / Vercel 환경변수 (운영)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # API Route에서만 사용 (서버 전용)

# 단말기 JWT 서명 키
TERMINAL_JWT_SECRET=your-secret-key-32chars
```

---

## 4. API Route 설계

### 4-1. 단말기 활성화

**POST `/api/device/activate`**

```typescript
// Request (단말기 → 서버)
{
  activationCode: string   // 6자리 활성화 코드
  terminalName?: string    // 단말기 이름 (선택)
}

// Response
{
  terminalId: string       // UUID
  termId: string           // 2자리 ID
  accessToken: string      // JWT (만료 없음 or 1년)
  merchantId: string
  config: object           // 초기 설정
}

// Error
{ error: 'INVALID_CODE' | 'ALREADY_ACTIVATED' }
```

**구현 로직**:
1. `activationCode`로 terminals 테이블 조회
2. 이미 `access_token` 있으면 `ALREADY_ACTIVATED`
3. JWT 생성: `{ terminalId, merchantId, termId }`
4. `terminals.access_token = JWT seed hash`, `status = 'online'`
5. 최신 `terminal_configs` 함께 반환

---

### 4-2. 설정 조회 (단말기 폴링)

**GET `/api/device/config`**

```typescript
// Headers
Authorization: Bearer {accessToken}
X-Config-Version: 5   // 현재 단말기 버전

// Response (변경된 경우)
{
  version: 6,
  config: { ... }
}

// Response (최신인 경우)
{ version: 5, changed: false }
```

**구현 로직**:
1. JWT 검증 → `terminalId` 추출
2. `terminal_configs` 에서 최신 버전 조회
3. `X-Config-Version` 보다 최신이면 config 반환
4. `terminals.last_seen_at` 업데이트, `status = 'online'`

---

### 4-3. 거래내역 저장

**POST `/api/transactions`**

```typescript
// Headers
Authorization: Bearer {accessToken}

// Request
{
  merchantOrderId: string
  menuName: string
  amount: number
  barcodeInfo: string
  paymentType: 'qr' | 'barcode' | 'rfcard'
  status: 'success' | 'cancelled'
  approvedAt: string   // ISO 8601
}

// Response
{ id: string }

// Batch (오프라인 동기화)
POST /api/transactions/batch
{ transactions: Transaction[] }
Response: { synced: number, failed: number }
```

---

### 4-4. 단말기 상태 업데이트 (Heartbeat)

**POST `/api/device/heartbeat`**

```typescript
// Headers
Authorization: Bearer {accessToken}

// Request
{ status: 'online' | 'offline' }

// Response
{ ok: true }
```

30초마다 단말기에서 호출 → `last_seen_at` 갱신

---

## 5. 파일 구조

### 신규 파일

```
app/
  api/
    device/
      activate/route.ts      단말기 최초 활성화
      config/route.ts        설정 조회 (폴링)
      heartbeat/route.ts     상태 업데이트
    transactions/
      route.ts               단말기 거래 저장
      batch/route.ts         오프라인 배치 동기화
  dashboard/
    layout.tsx               대시보드 레이아웃 (인증 체크)
    page.tsx                 메인 대시보드 (단말기 현황)
    terminals/
      page.tsx               단말기 목록/관리
      [id]/page.tsx          단말기 상세 / 설정 편집
    transactions/
      page.tsx               거래내역 조회
    settings/
      page.tsx               가맹점 설정

lib/
  supabase/
    client.ts                브라우저용 Supabase 클라이언트
    server.ts                서버 컴포넌트용 클라이언트
    admin.ts                 service_role 클라이언트 (API Route용)
  terminal/
    jwt.ts                   단말기 JWT 생성/검증
    auth.ts                  API Route 인증 미들웨어

types/
  supabase.ts                Supabase DB 타입 (자동생성 또는 수동)
  online.ts                  온라인 관리 도메인 타입
```

### 수정 파일 (기존 Electron POS)

```
lib/
  onlineSync.ts    (NEW) 서버 연동 통합 레이어
  configSync.ts    (NEW) 설정 폴링/Realtime 수신
  txSync.ts        (NEW) 거래내역 서버 저장 + 오프라인 큐
```

---

## 6. 단말기 앱 수정 설계

### 6-1. 초기화 플로우

```typescript
// lib/onlineSync.ts
export async function initOnlineSync() {
  const stored = localStorage.getItem('terminal_access_token')

  if (!stored) {
    // 활성화 코드 입력 화면 표시
    return { status: 'need_activation' }
  }

  // 설정 동기화 시작
  await configSync.start(stored)

  // 거래내역 미동기화 배치 전송
  await txSync.flushOfflineQueue(stored)

  return { status: 'online' }
}
```

### 6-2. 설정 동기화

```typescript
// lib/configSync.ts
const POLL_INTERVAL = 30_000  // 30초

export function start(accessToken: string) {
  // 1. Supabase Realtime 구독 시도
  const channel = supabase
    .channel('terminal-config')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'terminal_configs',
      filter: `terminal_id=eq.${terminalId}`
    }, handleConfigChange)
    .subscribe()

  // 2. Realtime 실패 시 폴링 fallback
  if (channel.state !== 'joined') {
    setInterval(() => pollConfig(accessToken), POLL_INTERVAL)
  }
}
```

### 6-3. 거래내역 저장

```typescript
// lib/txSync.ts
export async function saveTransaction(tx: TransactionData) {
  // 1. 로컬 IndexedDB에 먼저 저장 (기존 방식 유지)
  await db.transactions.add({ ...tx, synced: false })

  // 2. 온라인이면 즉시 서버 전송
  if (navigator.onLine) {
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tx)
      })
      await db.transactions.update(tx.id, { synced: true })
    } catch {
      // 오프라인 큐에 남김 - flushOfflineQueue에서 재시도
    }
  }
}
```

---

## 7. 관리 대시보드 설계

### 7-1. 레이아웃 구조

```
/dashboard
├── 헤더: 가맹점명, 로그아웃
├── 사이드바: 대시보드 / 단말기 관리 / 거래내역 / 설정
└── 콘텐츠 영역
```

### 7-2. 메인 대시보드 (`/dashboard`)

| 영역 | 내용 |
|------|------|
| 상단 카드 | 오늘 매출 합계, 거래건수, 온라인 단말기 수 |
| 단말기 현황 | 그리드: 단말기명, 상태(🟢/🔴), 마지막 접속 |
| 최근 거래 | 최근 10건 테이블 |

**Realtime 연동**: `terminals` 테이블 구독 → 온라인/오프라인 상태 실시간 반영

### 7-3. 단말기 관리 (`/dashboard/terminals`)

- 단말기 목록 (추가 버튼 → 활성화 코드 발급)
- 각 단말기 클릭 → 상세 페이지
  - 현재 설정 JSON 편집
  - 설정 저장 시 `terminal_configs` INSERT → 단말기 자동 수신

### 7-4. 설정 편집 UI

```typescript
// 기존 POS settings UI와 동일한 구조를 웹에서도 제공
interface TerminalConfig {
  termId: string
  cornerName: string
  storeName: string
  menuItems: MenuItem[]
  paymentSettings: PaymentSettings
  displaySettings: DisplaySettings
}
```

---

## 8. 인증 설계

### 8-1. 가맹점 관리자 (웹 대시보드)

- Supabase Auth (email + password)
- `@supabase/ssr` 패키지로 Next.js App Router 쿠키 기반 세션
- `/dashboard/**` → `middleware.ts`에서 세션 체크 → 미인증 시 `/login` 리다이렉트

### 8-2. 단말기 (API 인증)

```typescript
// lib/terminal/jwt.ts
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.TERMINAL_JWT_SECRET)

export async function createTerminalJWT(payload: {
  terminalId: string
  merchantId: string
  termId: string
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(secret)
}

export async function verifyTerminalJWT(token: string) {
  const { payload } = await jwtVerify(token, secret)
  return payload as { terminalId: string; merchantId: string; termId: string }
}
```

### 8-3. API Route 인증 미들웨어

```typescript
// lib/terminal/auth.ts
export async function requireTerminalAuth(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return { error: Response.json({ error: 'UNAUTHORIZED' }, { status: 401 }) }
  }
  try {
    const payload = await verifyTerminalJWT(auth.slice(7))
    return { payload }
  } catch {
    return { error: Response.json({ error: 'INVALID_TOKEN' }, { status: 401 }) }
  }
}
```

---

## 9. 구현 순서 (Do Phase 가이드)

| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | Supabase 패키지 설치 | `npm install @supabase/supabase-js @supabase/ssr jose` |
| 2 | Supabase 클라이언트 설정 | `lib/supabase/client.ts`, `server.ts`, `admin.ts` |
| 3 | DB 스키마 생성 | Supabase Dashboard SQL Editor |
| 4 | 환경변수 설정 | `.env.local` |
| 5 | 단말기 JWT 유틸 | `lib/terminal/jwt.ts`, `auth.ts` |
| 6 | 활성화 API | `app/api/device/activate/route.ts` |
| 7 | 설정 조회 API | `app/api/device/config/route.ts` |
| 8 | 거래내역 API | `app/api/transactions/route.ts` |
| 9 | Heartbeat API | `app/api/device/heartbeat/route.ts` |
| 10 | 가맹점 인증 (Supabase Auth) | `app/login/page.tsx`, `middleware.ts` |
| 11 | 대시보드 레이아웃 | `app/dashboard/layout.tsx` |
| 12 | 단말기 현황 페이지 | `app/dashboard/page.tsx` |
| 13 | 단말기 관리 페이지 | `app/dashboard/terminals/**` |
| 14 | 거래내역 페이지 | `app/dashboard/transactions/page.tsx` |
| 15 | POS 앱 온라인 연동 | `lib/onlineSync.ts`, `configSync.ts`, `txSync.ts` |
| 16 | 오프라인 동기화 | `app/api/transactions/batch/route.ts` |

---

## 10. 성공 기준 체크리스트

- [ ] `POST /api/device/activate` → 활성화 코드로 단말기 JWT 발급
- [ ] `GET /api/device/config` → JWT 인증 후 최신 설정 반환
- [ ] `POST /api/transactions` → 거래내역 Supabase 저장
- [ ] 대시보드에서 단말기 온라인/오프라인 실시간 확인
- [ ] 대시보드에서 설정 변경 → 30초 내 단말기 반영
- [ ] 오프라인 결제 후 온라인 복귀 시 자동 동기화
- [ ] 단말기 10대 동시 운영 테스트
