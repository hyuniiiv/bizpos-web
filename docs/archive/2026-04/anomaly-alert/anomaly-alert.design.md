# [Design] anomaly-alert

> **Summary**: 이상 거래 감지 → `anomaly_alerts` DB 기록 → 대시보드 배지 + 목록 페이지
>
> **Project**: BIZPOS Web
> **Date**: 2026-03-24
> **Status**: Draft
> **Planning Doc**: [anomaly-alert.plan.md](../../01-plan/features/anomaly-alert.plan.md)

---

## 1. Overview

### 1.1 현재 상태 (AS-IS)

- `app/api/transactions/route.ts` POST — Supabase `transactions` insert 후 `{ id }` 반환
- 이상 감지 로직 없음, `anomaly_alerts` 테이블 없음
- `app/dashboard/layout.tsx` — NavItem 6개, 알림 배지 없음

### 1.2 목표 상태 (TO-BE)

```
[단말기] POST /api/transactions
  └─ Supabase insert(transactions)
  └─ detectAnomalies(tx) ← 비동기, 블로킹 없음
       └─ Rule-01: duplicate_barcode
       └─ Rule-02: high_frequency
       └─ Rule-03: high_amount
       └─ 감지 시 insert(anomaly_alerts)

[대시보드]
  layout.tsx ← 미확인 알림 카운트 배지
  /dashboard/alerts ← 알림 목록 + 처리 완료
```

### 1.3 변경 파일 목록

| 파일 | 변경 | 이유 |
|------|------|------|
| `supabase/migrations/anomaly_alerts.sql` | 신규 | DB 스키마 |
| `lib/anomaly/detector.ts` | 신규 | 이상 감지 규칙 |
| `app/api/transactions/route.ts` | 수정 | 감지 함수 호출 추가 |
| `app/dashboard/alerts/page.tsx` | 신규 | 알림 목록 페이지 |
| `app/dashboard/layout.tsx` | 수정 | 알림 배지 추가 |
| `types/supabase.ts` | 수정 | AnomalyAlert 인터페이스 추가 |

---

## 2. DB 스키마

### 2.1 anomaly_alerts 테이블

```sql
-- supabase/migrations/anomaly_alerts.sql
CREATE TABLE anomaly_alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  terminal_id    uuid REFERENCES terminals(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  rule           text NOT NULL CHECK (rule IN ('duplicate_barcode','high_frequency','high_amount')),
  severity       text NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  detail         jsonb,
  resolved       bool NOT NULL DEFAULT false,
  resolved_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_anomaly_alerts_merchant_resolved
  ON anomaly_alerts (merchant_id, resolved, created_at DESC);

-- RLS (merchant 본인만 접근)
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_own" ON anomaly_alerts
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );
```

---

## 3. 변경 명세

### 3.1 types/supabase.ts — AnomalyAlert 인터페이스 추가

```typescript
export interface AnomalyAlert {
  id: string
  merchant_id: string
  terminal_id: string | null
  transaction_id: string | null
  rule: 'duplicate_barcode' | 'high_frequency' | 'high_amount'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  detail: Record<string, unknown> | null
  resolved: boolean
  resolved_at: string | null
  created_at: string
}
```

### 3.2 lib/anomaly/detector.ts (신규)

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

interface TxInput {
  id: string
  merchant_id: string
  terminal_id: string
  barcode_info: string | null
  amount: number
  approved_at: string
}

export async function detectAnomalies(tx: TxInput): Promise<void> {
  const supabase = createAdminClient()
  const now = new Date(tx.approved_at)

  // Rule-01: 동일 바코드 10분 내 2회 이상
  if (tx.barcode_info) {
    const since = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', tx.merchant_id)
      .eq('barcode_info', tx.barcode_info)
      .eq('status', 'success')
      .gte('approved_at', since)

    if ((count ?? 0) >= 2) {
      await supabase.from('anomaly_alerts').insert({
        merchant_id: tx.merchant_id,
        terminal_id: tx.terminal_id,
        transaction_id: tx.id,
        rule: 'duplicate_barcode',
        severity: 'HIGH',
        detail: { barcode_info: tx.barcode_info, count, window_minutes: 10 },
      })
    }
  }

  // Rule-02: 동일 단말기 1분 내 10건 이상
  {
    const since = new Date(now.getTime() - 1 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('terminal_id', tx.terminal_id)
      .eq('status', 'success')
      .gte('approved_at', since)

    if ((count ?? 0) >= 10) {
      await supabase.from('anomaly_alerts').insert({
        merchant_id: tx.merchant_id,
        terminal_id: tx.terminal_id,
        transaction_id: tx.id,
        rule: 'high_frequency',
        severity: 'MEDIUM',
        detail: { count, window_seconds: 60 },
      })
    }
  }

  // Rule-03: 단일 거래 50,000원 이상
  if (tx.amount >= 50000) {
    await supabase.from('anomaly_alerts').insert({
      merchant_id: tx.merchant_id,
      terminal_id: tx.terminal_id,
      transaction_id: tx.id,
      rule: 'high_amount',
      severity: 'LOW',
      detail: { amount: tx.amount, threshold: 50000 },
    })
  }
}
```

### 3.3 app/api/transactions/route.ts — 감지 함수 호출

현재 POST 핸들러의 `return NextResponse.json({ id: data.id })` 직전에 비동기 호출 추가:

```typescript
// 이상 감지 (비동기, 응답 블로킹 안 함)
import { detectAnomalies } from '@/lib/anomaly/detector'

// insert 성공 후:
detectAnomalies({
  id: data.id,
  merchant_id: merchantId,
  terminal_id: terminalId,
  barcode_info: barcodeInfo ?? null,
  amount,
  approved_at: approvedAt ?? new Date().toISOString(),
}).catch(console.error)  // 에러가 거래 응답에 영향 없도록

return NextResponse.json({ id: data.id })
```

### 3.4 app/dashboard/alerts/page.tsx (신규)

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Server Component — 알림 목록 조회
export default async function AlertsPage({ searchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // merchant_id 조회 (merchant_users 테이블)
  const { data: membership } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/setup')

  const showAll = searchParams?.show === 'all'

  const query = supabase
    .from('anomaly_alerts')
    .select('*, terminals(name, term_id)')
    .eq('merchant_id', membership.merchant_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!showAll) query.eq('resolved', false)

  const { data: alerts } = await query

  return <AlertsClient alerts={alerts ?? []} showAll={showAll} />
}
```

**AlertsClient (Client Component)**:
- 미확인 / 전체 토글 탭
- 알림 카드: 규칙명, 심각도 배지(색상), 단말기명, 발생 시간, detail 요약
- "처리 완료" 버튼 → `PATCH /api/alerts/[id]` 또는 직접 Supabase 클라이언트 호출

**API 라우트** `app/api/alerts/[id]/route.ts`:
```typescript
// PATCH: resolved = true 업데이트
export async function PATCH(req, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { error } = await supabase
    .from('anomaly_alerts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

### 3.5 app/dashboard/layout.tsx — 알림 배지

`NavItem`에 배지 지원 추가:

```typescript
// layout.tsx 수정
const { count: alertCount } = await supabase
  .from('anomaly_alerts')
  .select('*', { count: 'exact', head: true })
  .eq('merchant_id', merchantId)
  .eq('resolved', false)

// NavItem에 badge prop 추가
<NavItem href="/dashboard/alerts" badge={alertCount ?? 0}>이상 알림</NavItem>

// NavItem 컴포넌트 수정
function NavItem({ href, children, badge }: { href: string; children: React.ReactNode; badge?: number }) {
  return (
    <Link href={href} className="flex items-center justify-between px-3 py-2 rounded-lg ...">
      <span>{children}</span>
      {badge > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
```

---

## 4. 컴포넌트 구조

```
app/dashboard/alerts/
  page.tsx            — Server Component (DB 조회)
  AlertsClient.tsx    — 'use client' (탭 토글, 처리 완료 버튼)

app/api/alerts/
  [id]/route.ts       — PATCH (resolved 업데이트)

lib/anomaly/
  detector.ts         — Rule-01, Rule-02, Rule-03

supabase/migrations/
  anomaly_alerts.sql  — 테이블 + 인덱스 + RLS
```

---

## 5. 심각도 색상 규칙

| 심각도 | 배지 색상 | 설명 |
|--------|----------|------|
| HIGH | `bg-red-100 text-red-700` | 즉시 확인 필요 |
| MEDIUM | `bg-yellow-100 text-yellow-700` | 주의 |
| LOW | `bg-gray-100 text-gray-600` | 참고 |

---

## 6. 구현 순서

1. [ ] `supabase/migrations/anomaly_alerts.sql` 작성 → Supabase SQL Editor 실행
2. [ ] `types/supabase.ts` — `AnomalyAlert` 인터페이스 추가
3. [ ] `lib/anomaly/detector.ts` — 3개 규칙 구현
4. [ ] `app/api/transactions/route.ts` — `detectAnomalies()` 비동기 호출 추가
5. [ ] `app/api/alerts/[id]/route.ts` — PATCH 라우트
6. [ ] `app/dashboard/alerts/AlertsClient.tsx` — Client Component
7. [ ] `app/dashboard/alerts/page.tsx` — Server Component
8. [ ] `app/dashboard/layout.tsx` — 알림 배지 + 네비 링크 추가
9. [ ] `npx tsc --noEmit` 검증

---

## 7. 검증 기준

| 항목 | 검증 방법 |
|------|----------|
| Rule-01 중복 바코드 | 동일 barcode_info 10분 내 2회 POST → anomaly_alerts 레코드 생성 |
| Rule-03 고액 | amount=50000 POST → anomaly_alerts 생성 |
| 알림 목록 | `/dashboard/alerts` 접근 → 목록 표시 |
| 처리 완료 | "처리 완료" 클릭 → resolved=true, 미확인 탭에서 사라짐 |
| 배지 | 미확인 알림 존재 시 nav에 숫자 배지 표시 |
| tsc | TypeScript 오류 없음 |

---

## 버전 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 0.1 | 2026-03-24 | 초안 작성 (코드베이스 분석 기반) |
