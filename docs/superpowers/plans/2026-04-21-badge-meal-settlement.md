# 사원증 식수 일괄정산 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Bizplay 결제 단말기에 `inputPolicy` 기반 라우팅을 추가하여 바코드/QR/RF카드 입력을 결제 또는 식수기록으로 분기하고, 누적된 사용내역을 월별 정산서(PDF/Excel)로 집계한다.

**Architecture:** `DeviceConfig.inputPolicy`에서 각 입력 타입(barcode/qr/rfcard)을 `bizplay_payment | meal_record | disabled`로 매핑한다. `meal_record`로 라우팅된 스캔은 서버에서 사원 식별 → 중복 정책 → `meal_usages` INSERT 흐름으로 처리한다. 정산은 수동/자동으로 생성하며 PDF(`@react-pdf/renderer`)와 Excel(`xlsx`)을 서버사이드로 생성한다.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + pg_cron), TypeScript, @react-pdf/renderer, xlsx, Tailwind CSS

---

## Phase 1: 기반 — DB 마이그레이션 + 타입 정의

### Task 1: Supabase 마이그레이션 작성

**Files:**
- Create: `supabase/migrations/20260421000001_badge_meal_settlement.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260421000001_badge_meal_settlement.sql

-- 1. terminals 테이블에 input_policy 컬럼 추가
ALTER TABLE terminals
  ADD COLUMN IF NOT EXISTS input_policy jsonb NOT NULL DEFAULT
    '{"barcode":"bizplay_payment","qr":"bizplay_payment","rfcard":"bizplay_payment"}';

-- 2. merchants 테이블에 badge_settings 컬럼 추가
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS badge_settings jsonb NOT NULL DEFAULT
    '{"dup_policy":"block","settle_day":25}';

-- 3. employees 테이블 생성
CREATE TABLE IF NOT EXISTS employees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id),
  employee_no   text NOT NULL,
  name          text NOT NULL,
  department    text,
  card_number   text,
  barcode       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, employee_no)
);

-- card_number, barcode: NULL 허용, 존재 시 merchant 내 유일
CREATE UNIQUE INDEX IF NOT EXISTS employees_merchant_card_unique
  ON employees (merchant_id, card_number) WHERE card_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employees_merchant_barcode_unique
  ON employees (merchant_id, barcode) WHERE barcode IS NOT NULL;

-- 4. meal_usages 테이블 생성
CREATE TABLE IF NOT EXISTS meal_usages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id),
  terminal_id   uuid NOT NULL REFERENCES terminals(id),
  employee_id   uuid NOT NULL REFERENCES employees(id),
  meal_type     text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  used_at       timestamptz NOT NULL DEFAULT now(),
  amount        integer NOT NULL DEFAULT 0,
  menu_id       text,
  synced        boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS meal_usages_employee_used ON meal_usages (employee_id, used_at);
CREATE INDEX IF NOT EXISTS meal_usages_merchant_used ON meal_usages (merchant_id, used_at);

-- 5. settlements 테이블 생성
CREATE TABLE IF NOT EXISTS settlements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  total_count   integer NOT NULL DEFAULT 0,
  total_amount  integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at  timestamptz
);

-- 6. settlement_items 테이블 생성
CREATE TABLE IF NOT EXISTS settlement_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES employees(id),
  employee_no     text NOT NULL,
  employee_name   text NOT NULL,
  department      text,
  usage_count     integer NOT NULL DEFAULT 0,
  total_amount    integer NOT NULL DEFAULT 0,
  breakfast_count integer NOT NULL DEFAULT 0,
  lunch_count     integer NOT NULL DEFAULT 0,
  dinner_count    integer NOT NULL DEFAULT 0
);

-- 7. 자동 정산 cron (매월 settle_day 00:05)
-- pg_cron 확장이 활성화된 Supabase 환경에서만 동작
SELECT cron.schedule(
  'auto-settlement',
  '5 0 * * *',
  $$
  DO $$
  DECLARE
    rec RECORD;
    settle_day_val integer;
    today_day integer := EXTRACT(DAY FROM CURRENT_DATE);
  BEGIN
    FOR rec IN SELECT id, badge_settings FROM merchants WHERE badge_settings IS NOT NULL LOOP
      settle_day_val := (rec.badge_settings->>'settle_day')::integer;
      IF today_day = settle_day_val THEN
        INSERT INTO settlements (merchant_id, period_start, period_end, total_count, total_amount, status)
        SELECT
          rec.id,
          (CURRENT_DATE - INTERVAL '1 month')::date,
          (CURRENT_DATE - INTERVAL '1 day')::date,
          COUNT(mu.id),
          COALESCE(SUM(mu.amount), 0),
          'draft'
        FROM meal_usages mu
        WHERE mu.merchant_id = rec.id
          AND mu.used_at >= (CURRENT_DATE - INTERVAL '1 month')
          AND mu.used_at < CURRENT_DATE;
      END IF;
    END LOOP;
  END;
  $$ LANGUAGE plpgsql;
  $$
);
```

- [ ] **Step 2: 마이그레이션 적용 확인**

```bash
# 로컬 Supabase 사용 시
npx supabase db push

# 또는 대시보드 SQL 에디터에서 직접 실행
```

Expected: 오류 없이 완료

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260421000001_badge_meal_settlement.sql
git commit -m "feat: add badge meal settlement DB migration"
```

---

### Task 2: TypeScript 타입 추가

**Files:**
- Modify: `types/menu.ts`

- [ ] **Step 1: 현재 파일 읽기**

`types/menu.ts` 파일을 읽어 기존 타입 확인

- [ ] **Step 2: InputPolicy 타입 추가**

`types/menu.ts`의 `DeviceConfig` 인터페이스 아래에 추가:

```typescript
// types/menu.ts 에 추가할 내용

export type InputAction = 'bizplay_payment' | 'meal_record' | 'disabled'

export interface InputPolicy {
  barcode: InputAction
  qr:      InputAction
  rfcard:  InputAction
}

// DeviceConfig 인터페이스에 추가:
// inputPolicy?: InputPolicy
```

`DeviceConfig` 인터페이스에 `inputPolicy?: InputPolicy` 필드 추가.

- [ ] **Step 3: 식수/정산 관련 타입 추가**

```typescript
// types/menu.ts 에 추가

export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type DupPolicy = 'block' | 'allow' | 'warn'

export interface BadgeSettings {
  dup_policy: DupPolicy
  settle_day: number  // 1~28
}

export interface Employee {
  id: string
  merchant_id: string
  employee_no: string
  name: string
  department?: string
  card_number?: string
  barcode?: string
  is_active: boolean
  created_at: string
}

export interface MealUsage {
  id: string
  merchant_id: string
  terminal_id: string
  employee_id: string
  meal_type: MealType
  used_at: string
  amount: number
  menu_id?: string
  synced: boolean
}

export interface Settlement {
  id: string
  merchant_id: string
  period_start: string
  period_end: string
  total_count: number
  total_amount: number
  status: 'draft' | 'confirmed'
  created_at: string
  confirmed_at?: string
}

export interface SettlementItem {
  id: string
  settlement_id: string
  employee_id: string
  employee_no: string
  employee_name: string
  department?: string
  usage_count: number
  total_amount: number
  breakfast_count: number
  lunch_count: number
  dinner_count: number
}
```

- [ ] **Step 4: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 타입 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add types/menu.ts
git commit -m "feat: add InputPolicy, meal, settlement types"
```

---

## Phase 2: POS 배지 스캔 처리

### Task 3: 끼니 자동 판별 유틸리티

**Files:**
- Create: `lib/meal/mealTypeDetector.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// lib/meal/mealTypeDetector.ts
import type { PeriodConfig, MealType } from '@/types/menu'

/**
 * 현재 시각과 PeriodConfig 기준으로 끼니 타입을 반환한다.
 * 매칭되는 시간대 없으면 'lunch' 반환.
 */
export function detectMealType(periods: PeriodConfig[]): MealType {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const period of periods) {
    if (!period.startTime || !period.endTime) continue
    const [sh, sm] = period.startTime.split(':').map(Number)
    const [eh, em] = period.endTime.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (currentMinutes >= start && currentMinutes < end) {
      // PeriodConfig의 meal 필드가 있으면 사용, 없으면 이름으로 추론
      if (period.meal) return period.meal as MealType
      const name = (period.name ?? '').toLowerCase()
      if (name.includes('조식') || name.includes('breakfast')) return 'breakfast'
      if (name.includes('석식') || name.includes('dinner')) return 'dinner'
      return 'lunch'
    }
  }
  return 'lunch'
}
```

- [ ] **Step 2: 테스트 작성**

```typescript
// lib/meal/__tests__/mealTypeDetector.test.ts
import { detectMealType } from '../mealTypeDetector'

const mockPeriods = [
  { startTime: '07:00', endTime: '09:00', name: '조식', meal: 'breakfast' },
  { startTime: '11:30', endTime: '13:30', name: '중식', meal: 'lunch' },
  { startTime: '17:30', endTime: '19:30', name: '석식', meal: 'dinner' },
]

describe('detectMealType', () => {
  it('08:00이면 breakfast 반환', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-21T08:00:00'))
    expect(detectMealType(mockPeriods as any)).toBe('breakfast')
    jest.useRealTimers()
  })

  it('시간대 없으면 lunch 반환', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-21T15:00:00'))
    expect(detectMealType(mockPeriods as any)).toBe('lunch')
    jest.useRealTimers()
  })

  it('빈 periods는 lunch 반환', () => {
    expect(detectMealType([])).toBe('lunch')
  })
})
```

- [ ] **Step 3: 테스트 실행**

```bash
npx jest lib/meal/__tests__/mealTypeDetector.test.ts
```

Expected: 3 tests pass

- [ ] **Step 4: 커밋**

```bash
git add lib/meal/mealTypeDetector.ts lib/meal/__tests__/mealTypeDetector.test.ts
git commit -m "feat: add mealTypeDetector utility"
```

---

### Task 4: 사원 조회 유틸리티

**Files:**
- Create: `lib/meal/employeeLookup.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// lib/meal/employeeLookup.ts
import { createClient } from '@/lib/supabase/server'
import type { Employee } from '@/types/menu'

export type LookupResult =
  | { found: true; employee: Employee }
  | { found: false }

/**
 * merchantId 범위 내에서 card_number 또는 barcode로 사원을 조회한다.
 */
export async function lookupEmployee(
  merchantId: string,
  rawInput: string,
): Promise<LookupResult> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .or(`card_number.eq.${rawInput},barcode.eq.${rawInput}`)
    .maybeSingle()

  if (error || !data) return { found: false }
  return { found: true, employee: data as Employee }
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/meal/employeeLookup.ts
git commit -m "feat: add employeeLookup utility"
```

---

### Task 5: 식수 기록 서버 API

**Files:**
- Create: `app/api/meal/record/route.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// app/api/meal/record/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireTerminalAuth } from '@/lib/auth/terminalAuth'
import { lookupEmployee } from '@/lib/meal/employeeLookup'
import { detectMealType } from '@/lib/meal/mealTypeDetector'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const authResult = await requireTerminalAuth(req)
  if (!authResult.ok) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const { terminalId, merchantId } = authResult

  const body = await req.json()
  const { rawInput } = body as { rawInput: string }

  // 사원 조회
  const lookup = await lookupEmployee(merchantId, rawInput)
  if (!lookup.found) {
    return NextResponse.json({ error: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
  }
  const { employee } = lookup

  const supabase = createClient()

  // 고객사 중복 정책 조회
  const { data: merchant } = await supabase
    .from('merchants')
    .select('badge_settings')
    .eq('id', merchantId)
    .single()

  const dupPolicy: string = merchant?.badge_settings?.dup_policy ?? 'block'

  // 끼니 판별
  const { data: periodsData } = await supabase
    .from('terminals')
    .select('config')
    .eq('id', terminalId)
    .single()

  const periods = periodsData?.config?.periods ?? []
  const mealType = detectMealType(periods)

  // 당일 동일 끼니 중복 체크
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: existing } = await supabase
    .from('meal_usages')
    .select('id')
    .eq('employee_id', employee.id)
    .eq('meal_type', mealType)
    .gte('used_at', todayStart.toISOString())
    .maybeSingle()

  if (existing) {
    if (dupPolicy === 'block') {
      return NextResponse.json({ error: 'DUPLICATE_BLOCKED' }, { status: 409 })
    }
    if (dupPolicy === 'warn') {
      // 경고는 기록 후 반환 (클라이언트가 타이머 후 통과)
      return NextResponse.json({
        ok: true,
        warn: 'DUPLICATE_WARN',
        employee: { name: employee.name, department: employee.department },
        meal_type: mealType,
      })
    }
    // allow: 그냥 통과
  }

  // meal_usages INSERT
  const { error: insertError } = await supabase
    .from('meal_usages')
    .insert({
      merchant_id: merchantId,
      terminal_id: terminalId,
      employee_id: employee.id,
      meal_type: mealType,
      amount: 0,
      synced: true,
    })

  if (insertError) {
    console.error('[meal/record] insert error:', insertError)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    employee: { name: employee.name, department: employee.department },
    meal_type: mealType,
  })
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/meal/record/route.ts
git commit -m "feat: add POST /api/meal/record endpoint"
```

---

### Task 6: 클라이언트 mealRecord 헬퍼 + BadgeScreen + WarnScreen

**Files:**
- Create: `lib/meal/mealRecord.ts`
- Create: `components/pos/screens/BadgeScreen.tsx`
- Create: `components/pos/WarnScreen.tsx`

- [ ] **Step 1: mealRecord 헬퍼 작성**

```typescript
// lib/meal/mealRecord.ts
import type { MealType } from '@/types/menu'

export type MealRecordResult =
  | { status: 'ok'; employeeName: string; department?: string; mealType: MealType }
  | { status: 'warn'; employeeName: string; department?: string; mealType: MealType }
  | { status: 'error'; code: 'EMPLOYEE_NOT_FOUND' | 'DUPLICATE_BLOCKED' | 'SERVER_ERROR' }

export async function recordMealUsage(
  rawInput: string,
  deviceToken: string,
): Promise<MealRecordResult> {
  try {
    const res = await fetch('/api/meal/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deviceToken}`,
      },
      body: JSON.stringify({ rawInput }),
    })

    const data = await res.json()

    if (!res.ok) {
      const code = data.error ?? 'SERVER_ERROR'
      return { status: 'error', code }
    }

    if (data.warn === 'DUPLICATE_WARN') {
      return {
        status: 'warn',
        employeeName: data.employee.name,
        department: data.employee.department,
        mealType: data.meal_type,
      }
    }

    return {
      status: 'ok',
      employeeName: data.employee.name,
      department: data.employee.department,
      mealType: data.meal_type,
    }
  } catch {
    return { status: 'error', code: 'SERVER_ERROR' }
  }
}
```

- [ ] **Step 2: BadgeScreen 컴포넌트 작성**

```tsx
// components/pos/screens/BadgeScreen.tsx
'use client'
import { useEffect } from 'react'
import type { MealType } from '@/types/menu'

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '조식',
  lunch: '중식',
  dinner: '석식',
}

interface Props {
  variant: 'success' | 'warn'
  employeeName: string
  department?: string
  mealType: MealType
  onDone: () => void
}

export default function BadgeScreen({ variant, employeeName, department, mealType, onDone }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDone, variant === 'warn' ? 5000 : 3000)
    return () => clearTimeout(timer)
  }, [variant, onDone])

  const isSuccess = variant === 'success'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950">
      <div className={`text-8xl mb-6 ${isSuccess ? 'text-green-400' : 'text-yellow-400'}`}>
        {isSuccess ? '✓' : '⚠'}
      </div>
      <p className="text-3xl font-bold text-white mb-2">{employeeName}</p>
      {department && <p className="text-lg text-gray-400 mb-4">{department}</p>}
      <p className={`text-xl font-semibold ${isSuccess ? 'text-green-300' : 'text-yellow-300'}`}>
        {MEAL_LABEL[mealType]} {isSuccess ? '이용 완료' : '중복 태깅 (자동 통과)'}
      </p>
      {!isSuccess && (
        <p className="text-sm text-gray-500 mt-4">5초 후 자동으로 넘어갑니다</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: WarnScreen 컴포넌트 작성**

```tsx
// components/pos/WarnScreen.tsx
'use client'
import { useEffect, useState } from 'react'

interface Props {
  message: string
  onDone: () => void
  autoPassSeconds?: number
}

export default function WarnScreen({ message, onDone, autoPassSeconds = 5 }: Props) {
  const [remaining, setRemaining] = useState(autoPassSeconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(interval)
          onDone()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-yellow-950">
      <div className="text-8xl text-yellow-400 mb-6">⚠</div>
      <p className="text-2xl font-bold text-yellow-200 text-center px-8">{message}</p>
      <p className="text-lg text-yellow-500 mt-6">{remaining}초 후 자동 통과</p>
    </div>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add lib/meal/mealRecord.ts components/pos/screens/BadgeScreen.tsx components/pos/WarnScreen.tsx
git commit -m "feat: add mealRecord helper and badge screens"
```

---

### Task 7: pos/page.tsx에 inputPolicy 분기 추가

**Files:**
- Modify: `app/pos/page.tsx`

- [ ] **Step 1: 현재 파일 읽기**

`app/pos/page.tsx` 전체를 읽어 `handleScan` 함수 위치 확인

- [ ] **Step 2: import 추가**

파일 상단 import에 추가:

```typescript
import { recordMealUsage } from '@/lib/meal/mealRecord'
import BadgeScreen from '@/components/pos/screens/BadgeScreen'
import type { MealType } from '@/types/menu'
```

- [ ] **Step 3: state 추가**

`usePosStore` 훅 호출 아래에:

```typescript
const [badgeResult, setBadgeResult] = useState<{
  variant: 'success' | 'warn'
  employeeName: string
  department?: string
  mealType: MealType
} | null>(null)
```

- [ ] **Step 4: handleScan 시작 부분에 meal_record 분기 추가**

`handleScan` 내의 `identifyInput(input)` 호출 직후, `identity.voucherType === 'unknown'` 체크 전에:

```typescript
// inputPolicy 분기
const inputType = identity.type as 'barcode' | 'qr' | 'rfcard'
const action = config.inputPolicy?.[inputType] ?? 'bizplay_payment'

if (action === 'disabled') return

if (action === 'meal_record') {
  setScreen('processing')
  const result = await recordMealUsage(identity.raw, deviceToken ?? '')
  if (result.status === 'error') {
    const errorMessages: Record<string, string> = {
      EMPLOYEE_NOT_FOUND: '등록되지 않은 사원증입니다.',
      DUPLICATE_BLOCKED: '이미 이용하셨습니다.',
      SERVER_ERROR: '처리 중 오류가 발생했습니다.',
    }
    setLastError(errorMessages[result.code] ?? '오류가 발생했습니다.')
    setScreen('fail')
    return
  }
  setBadgeResult({
    variant: result.status === 'warn' ? 'warn' : 'success',
    employeeName: result.employeeName,
    department: result.department,
    mealType: result.mealType,
  })
  setScreen('single') // 오버레이를 BadgeScreen이 담당하므로 기본 화면 복귀
  return
}
```

- [ ] **Step 5: 오버레이 렌더링에 BadgeScreen 추가**

기존 `{screen === 'fail' && ...}` 아래에:

```tsx
{badgeResult && (
  <BadgeScreen
    variant={badgeResult.variant}
    employeeName={badgeResult.employeeName}
    department={badgeResult.department}
    mealType={badgeResult.mealType}
    onDone={() => {
      setBadgeResult(null)
      const mode = getCurrentMode()
      setScreen(mode === 'multi' ? 'menu-select' : 'single')
    }}
  />
)}
```

- [ ] **Step 6: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 타입 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add app/pos/page.tsx
git commit -m "feat: add inputPolicy routing to handleScan"
```

---

## Phase 3: 사원 관리

### Task 8: 사원 CRUD API

**Files:**
- Create: `app/api/merchant/employees/route.ts`
- Create: `app/api/merchant/employees/[id]/route.ts`
- Create: `app/api/merchant/employees/sync/route.ts`

- [ ] **Step 1: 목록/생성 API 작성**

```typescript
// app/api/merchant/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireMerchantAuth } from '@/lib/auth/merchantAuth'

export async function GET(req: NextRequest) {
  const auth = await requireMerchantAuth(req)
  if (!auth.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const q = searchParams.get('q') ?? ''
  const offset = (page - 1) * limit

  const supabase = createClient()
  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('merchant_id', auth.merchantId)
    .order('employee_no')
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.or(`name.ilike.%${q}%,employee_no.ilike.%${q}%,department.ilike.%${q}%`)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const auth = await requireMerchantAuth(req)
  if (!auth.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const { employee_no, name, department, card_number, barcode } = body

  if (!employee_no || !name) {
    return NextResponse.json({ error: 'employee_no and name are required' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('employees')
    .insert({ merchant_id: auth.merchantId, employee_no, name, department, card_number, barcode })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'DUPLICATE_EMPLOYEE_NO' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: 개별 수정/삭제 API 작성**

```typescript
// app/api/merchant/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireMerchantAuth } from '@/lib/auth/merchantAuth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireMerchantAuth(req)
  if (!auth.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('employees')
    .update(body)
    .eq('id', params.id)
    .eq('merchant_id', auth.merchantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireMerchantAuth(req)
  if (!auth.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const supabase = createClient()
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('merchant_id', auth.merchantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: 외부 API 연동 (sync) 작성**

```typescript
// app/api/merchant/employees/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // X-Merchant-Key 헤더로 인증
  const merchantKey = req.headers.get('X-Merchant-Key')
  if (!merchantKey) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: keyRow } = await supabase
    .from('merchant_keys')
    .select('merchant_id')
    .eq('key', merchantKey)
    .eq('is_active', true)
    .single()

  if (!keyRow) {
    return NextResponse.json({ error: 'INVALID_KEY' }, { status: 401 })
  }

  const body = await req.json()
  const employees: Array<{
    employee_no: string
    name: string
    department?: string
    card_number?: string
    barcode?: string
  }> = body.employees ?? []

  if (!Array.isArray(employees) || employees.length === 0) {
    return NextResponse.json({ error: 'employees array required' }, { status: 400 })
  }

  const rows = employees.map(e => ({
    ...e,
    merchant_id: keyRow.merchant_id,
  }))

  const { error } = await supabase
    .from('employees')
    .upsert(rows, { onConflict: 'merchant_id,employee_no', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, synced: rows.length })
}
```

- [ ] **Step 4: 커밋**

```bash
git add app/api/merchant/employees/
git commit -m "feat: add employee CRUD and sync API endpoints"
```

---

### Task 9: 사원 관리 대시보드 페이지

**Files:**
- Create: `app/dashboard/employees/page.tsx`

- [ ] **Step 1: 페이지 작성**

```tsx
// app/dashboard/employees/page.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import type { Employee } from '@/types/menu'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchEmployees = async (p = page, query = q) => {
    setLoading(true)
    const res = await fetch(`/api/merchant/employees?page=${p}&limit=50&q=${encodeURIComponent(query)}`)
    const json = await res.json()
    setEmployees(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchEmployees() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchEmployees(1, q)
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').slice(1) // 헤더 제거
    const employees = lines.map(line => {
      const [employee_no, name, department, card_number, barcode] = line.split(',').map(s => s.trim())
      return { employee_no, name, department, card_number, barcode }
    }).filter(e => e.employee_no && e.name)

    const res = await fetch('/api/merchant/employees/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees }),
    })
    if (res.ok) {
      alert(`업로드 완료`)
      fetchEmployees()
    } else {
      alert('업로드 실패')
    }
  }

  const handleToggleActive = async (emp: Employee) => {
    await fetch(`/api/merchant/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !emp.is_active }),
    })
    fetchEmployees()
  }

  const handleCsvDownload = () => {
    const header = 'employee_no,name,department,card_number,barcode\n'
    const rows = employees.map(e =>
      [e.employee_no, e.name, e.department ?? '', e.card_number ?? '', e.barcode ?? ''].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employees.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">사원 관리</h1>
        <div className="flex gap-2">
          <button
            onClick={handleCsvDownload}
            className="px-4 py-2 text-sm bg-gray-700 rounded hover:bg-gray-600"
          >
            CSV 다운로드
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-500"
          >
            CSV 업로드
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="이름, 사원번호, 부서 검색..."
          className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-600 text-white"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
          검색
        </button>
      </form>

      {loading ? (
        <div className="text-gray-400">로딩 중...</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left py-2 px-3">사원번호</th>
              <th className="text-left py-2 px-3">이름</th>
              <th className="text-left py-2 px-3">부서</th>
              <th className="text-left py-2 px-3">카드번호</th>
              <th className="text-left py-2 px-3">바코드</th>
              <th className="text-left py-2 px-3">상태</th>
              <th className="text-left py-2 px-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-2 px-3">{emp.employee_no}</td>
                <td className="py-2 px-3">{emp.name}</td>
                <td className="py-2 px-3 text-gray-400">{emp.department ?? '-'}</td>
                <td className="py-2 px-3 text-gray-400">{emp.card_number ?? '-'}</td>
                <td className="py-2 px-3 text-gray-400">{emp.barcode ?? '-'}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${emp.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {emp.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <button
                    onClick={() => handleToggleActive(emp)}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    {emp.is_active ? '비활성화' : '활성화'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
        <span>총 {total}명</span>
        <div className="flex gap-2">
          {page > 1 && (
            <button onClick={() => setPage(p => p - 1)} className="hover:text-white">이전</button>
          )}
          <span>{page}</span>
          {employees.length === 50 && (
            <button onClick={() => setPage(p => p + 1)} className="hover:text-white">다음</button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/dashboard/employees/page.tsx
git commit -m "feat: add employee management dashboard page"
```

---

## Phase 4: 정산

### Task 10: 정산 생성/조회 API

**Files:**
- Create: `app/api/settlements/route.ts`
- Create: `app/api/settlements/[id]/route.ts`

- [ ] **Step 1: 정산 목록/생성 API 작성**

```typescript
// app/api/settlements/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireMerchantAuth } from '@/lib/auth/merchantAuth'

export async function GET(req: NextRequest) {
  const auth = await requireMerchantAuth(req)
  if (!auth.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('merchant_id', auth.merchantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const auth = await requireMerchantAuth(req)
  if (!auth.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const { period_start, period_end } = body as { period_start: string; period_end: string }

  if (!period_start || !period_end) {
    return NextResponse.json({ error: 'period_start and period_end required' }, { status: 400 })
  }

  const supabase = createClient()

  // 집계
  const { data: usages, error: usageError } = await supabase
    .from('meal_usages')
    .select('employee_id, meal_type, amount')
    .eq('merchant_id', auth.merchantId)
    .gte('used_at', period_start)
    .lte('used_at', period_end + 'T23:59:59')

  if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 })

  // employee별 집계
  const empMap = new Map<string, {
    usage_count: number
    total_amount: number
    breakfast_count: number
    lunch_count: number
    dinner_count: number
  }>()

  for (const u of usages ?? []) {
    const prev = empMap.get(u.employee_id) ?? {
      usage_count: 0, total_amount: 0, breakfast_count: 0, lunch_count: 0, dinner_count: 0
    }
    prev.usage_count += 1
    prev.total_amount += u.amount
    if (u.meal_type === 'breakfast') prev.breakfast_count += 1
    if (u.meal_type === 'lunch') prev.lunch_count += 1
    if (u.meal_type === 'dinner') prev.dinner_count += 1
    empMap.set(u.employee_id, prev)
  }

  const totalCount = Array.from(empMap.values()).reduce((s, e) => s + e.usage_count, 0)
  const totalAmount = Array.from(empMap.values()).reduce((s, e) => s + e.total_amount, 0)

  // settlements INSERT
  const { data: settlement, error: settleError } = await supabase
    .from('settlements')
    .insert({
      merchant_id: auth.merchantId,
      period_start,
      period_end,
      total_count: totalCount,
      total_amount: totalAmount,
      status: 'draft',
    })
    .select()
    .single()

  if (settleError) return NextResponse.json({ error: settleError.message }, { status: 500 })

  // employee 정보 조회
  const employeeIds = Array.from(empMap.keys())
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_no, name, department')
    .in('id', employeeIds)

  const empInfo = new Map((employees ?? []).map(e => [e.id, e]))

  // settlement_items INSERT
  const items = Array.from(empMap.entries()).map(([empId, stats]) => {
    const info = empInfo.get(empId)
    return {
      settlement_id: settlement.id,
      employee_id: empId,
      employee_no: info?.employee_no ?? '',
      employee_name: info?.name ?? '',
      department: info?.department,
      ...stats,
    }
  })

  if (items.length > 0) {
    await supabase.from('settlement_items').insert(items)
  }

  return NextResponse.json({ data: settlement }, { status: 201 })
}
```

- [ ] **Step 2: 정산 상세/확정/다운로드 API 작성**

```typescript
// app/api/settlements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireMerchantAuth } from '@/lib/auth/merchantAuth'
import { generateSettlementExcel } from '@/lib/settlement/generateExcel'
import { generateSettlementPdf } from '@/lib/settlement/generatePdf'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireMerchantAuth(req)
  if (!auth.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') // 'pdf' | 'excel'

  const supabase = createClient()
  const { data: settlement } = await supabase
    .from('settlements')
    .select('*')
    .eq('id', params.id)
    .eq('merchant_id', auth.merchantId)
    .single()

  if (!settlement) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const { data: items } = await supabase
    .from('settlement_items')
    .select('*')
    .eq('settlement_id', params.id)
    .order('employee_no')

  if (format === 'excel') {
    const buffer = await generateSettlementExcel(settlement, items ?? [])
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="settlement-${params.id}.xlsx"`,
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await generateSettlementPdf(settlement, items ?? [])
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="settlement-${params.id}.pdf"`,
      },
    })
  }

  return NextResponse.json({ data: settlement, items })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireMerchantAuth(req)
  if (!auth.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  if (body.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirm action allowed' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('settlements')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('merchant_id', auth.merchantId)
    .eq('status', 'draft')
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'NOT_FOUND_OR_ALREADY_CONFIRMED' }, { status: 404 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/settlements/
git commit -m "feat: add settlements CRUD and confirm API"
```

---

### Task 11: Excel/PDF 생성 유틸리티

**Files:**
- Create: `lib/settlement/generateExcel.ts`
- Create: `lib/settlement/generatePdf.tsx`

- [ ] **Step 1: xlsx 패키지 설치 확인**

```bash
npm list xlsx || npm install xlsx
```

- [ ] **Step 2: generateExcel 작성**

```typescript
// lib/settlement/generateExcel.ts
import * as XLSX from 'xlsx'
import type { Settlement, SettlementItem } from '@/types/menu'

export async function generateSettlementExcel(
  settlement: Settlement,
  items: SettlementItem[],
): Promise<Buffer> {
  const wb = XLSX.utils.book_new()

  const headerRow = ['사원번호', '이름', '부서', '조식', '중식', '석식', '합계횟수', '합계금액(원)']
  const dataRows = items.map(item => [
    item.employee_no,
    item.employee_name,
    item.department ?? '',
    item.breakfast_count,
    item.lunch_count,
    item.dinner_count,
    item.usage_count,
    item.total_amount,
  ])

  const totalRow = [
    '합계', '', '',
    items.reduce((s, i) => s + i.breakfast_count, 0),
    items.reduce((s, i) => s + i.lunch_count, 0),
    items.reduce((s, i) => s + i.dinner_count, 0),
    settlement.total_count,
    settlement.total_amount,
  ]

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows, totalRow])
  ws['!cols'] = [12, 10, 12, 6, 6, 6, 10, 14].map(wch => ({ wch }))

  XLSX.utils.book_append_sheet(wb, ws, '정산내역')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buf
}
```

- [ ] **Step 3: @react-pdf/renderer 설치 확인**

```bash
npm list @react-pdf/renderer || npm install @react-pdf/renderer
```

- [ ] **Step 4: generatePdf 작성**

```tsx
// lib/settlement/generatePdf.tsx
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Settlement, SettlementItem } from '@/types/menu'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 11, color: '#666', marginBottom: 20 },
  table: { display: 'flex', flexDirection: 'column', borderWidth: 1, borderColor: '#ddd' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd' },
  headerRow: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#ddd' },
  cell: { padding: '4 6', flex: 1 },
  cellRight: { padding: '4 6', flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', backgroundColor: '#fffde7', fontWeight: 'bold' },
})

export async function generateSettlementPdf(
  settlement: Settlement,
  items: SettlementItem[],
): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>식수 정산서</Text>
        <Text style={styles.subtitle}>
          기간: {settlement.period_start} ~ {settlement.period_end}
        </Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            {['사원번호', '이름', '부서', '조식', '중식', '석식', '합계', '금액'].map(h => (
              <Text key={h} style={styles.cell}>{h}</Text>
            ))}
          </View>
          {items.map(item => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.cell}>{item.employee_no}</Text>
              <Text style={styles.cell}>{item.employee_name}</Text>
              <Text style={styles.cell}>{item.department ?? ''}</Text>
              <Text style={styles.cellRight}>{item.breakfast_count}</Text>
              <Text style={styles.cellRight}>{item.lunch_count}</Text>
              <Text style={styles.cellRight}>{item.dinner_count}</Text>
              <Text style={styles.cellRight}>{item.usage_count}</Text>
              <Text style={styles.cellRight}>{item.total_amount.toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.cell}>합계</Text>
            <Text style={styles.cell}></Text>
            <Text style={styles.cell}></Text>
            <Text style={styles.cellRight}>{items.reduce((s, i) => s + i.breakfast_count, 0)}</Text>
            <Text style={styles.cellRight}>{items.reduce((s, i) => s + i.lunch_count, 0)}</Text>
            <Text style={styles.cellRight}>{items.reduce((s, i) => s + i.dinner_count, 0)}</Text>
            <Text style={styles.cellRight}>{settlement.total_count}</Text>
            <Text style={styles.cellRight}>{settlement.total_amount.toLocaleString()}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )

  return renderToBuffer(doc)
}
```

- [ ] **Step 5: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 타입 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add lib/settlement/
git commit -m "feat: add Excel and PDF settlement generators"
```

---

### Task 12: 정산 대시보드 페이지

**Files:**
- Create: `app/dashboard/settlements/page.tsx`

- [ ] **Step 1: 페이지 작성**

```tsx
// app/dashboard/settlements/page.tsx
'use client'
import { useEffect, useState } from 'react'
import type { Settlement, SettlementItem } from '@/types/menu'

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selected, setSelected] = useState<{ settlement: Settlement; items: SettlementItem[] } | null>(null)
  const [creating, setCreating] = useState(false)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const fetchSettlements = async () => {
    const res = await fetch('/api/settlements')
    const json = await res.json()
    setSettlements(json.data ?? [])
  }

  useEffect(() => { fetchSettlements() }, [])

  const handleCreate = async () => {
    if (!periodStart || !periodEnd) return
    setCreating(true)
    const res = await fetch('/api/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
    })
    setCreating(false)
    if (res.ok) fetchSettlements()
    else alert('정산 생성 실패')
  }

  const handleSelect = async (s: Settlement) => {
    const res = await fetch(`/api/settlements/${s.id}`)
    const json = await res.json()
    setSelected({ settlement: json.data, items: json.items ?? [] })
  }

  const handleConfirm = async (id: string) => {
    if (!confirm('정산을 확정하시겠습니까? 이후 수정이 불가합니다.')) return
    await fetch(`/api/settlements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    fetchSettlements()
    if (selected) {
      const res = await fetch(`/api/settlements/${id}`)
      const json = await res.json()
      setSelected({ settlement: json.data, items: json.items ?? [] })
    }
  }

  const handleDownload = (id: string, format: 'excel' | 'pdf') => {
    window.open(`/api/settlements/${id}?format=${format}`, '_blank')
  }

  return (
    <div className="p-6 flex gap-6">
      {/* 목록 */}
      <div className="w-72 flex-shrink-0">
        <h1 className="text-xl font-bold mb-4">정산 목록</h1>

        {/* 수동 생성 */}
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <p className="text-sm text-gray-400 mb-2">정산 기간 선택</p>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            className="w-full mb-2 px-2 py-1 bg-gray-700 rounded text-sm" />
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            className="w-full mb-2 px-2 py-1 bg-gray-700 rounded text-sm" />
          <button onClick={handleCreate} disabled={creating}
            className="w-full py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-500 disabled:opacity-50">
            {creating ? '생성 중...' : '정산 생성'}
          </button>
        </div>

        {/* 목록 */}
        <div className="space-y-2">
          {settlements.map(s => (
            <button key={s.id} onClick={() => handleSelect(s)}
              className={`w-full text-left p-3 rounded border ${
                selected?.settlement.id === s.id
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-700 hover:border-gray-500'
              }`}>
              <p className="text-sm font-medium">{s.period_start} ~ {s.period_end}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {s.total_count}건 · {s.total_amount.toLocaleString()}원
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${
                s.status === 'confirmed' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
              }`}>
                {s.status === 'confirmed' ? '확정' : '초안'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 상세 */}
      {selected && (
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {selected.settlement.period_start} ~ {selected.settlement.period_end}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => handleDownload(selected.settlement.id, 'excel')}
                className="px-3 py-1.5 text-sm bg-green-700 rounded hover:bg-green-600">
                Excel
              </button>
              <button onClick={() => handleDownload(selected.settlement.id, 'pdf')}
                className="px-3 py-1.5 text-sm bg-red-700 rounded hover:bg-red-600">
                PDF
              </button>
              {selected.settlement.status === 'draft' && (
                <button onClick={() => handleConfirm(selected.settlement.id)}
                  className="px-3 py-1.5 text-sm bg-blue-600 rounded hover:bg-blue-500">
                  정산 확정
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-4 text-sm">
            <div className="px-4 py-3 bg-gray-800 rounded">
              <p className="text-gray-400">총 이용 건수</p>
              <p className="text-xl font-bold">{selected.settlement.total_count}건</p>
            </div>
            <div className="px-4 py-3 bg-gray-800 rounded">
              <p className="text-gray-400">총 금액</p>
              <p className="text-xl font-bold">{selected.settlement.total_amount.toLocaleString()}원</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left py-2 px-3">사원번호</th>
                <th className="text-left py-2 px-3">이름</th>
                <th className="text-left py-2 px-3">부서</th>
                <th className="text-right py-2 px-3">조식</th>
                <th className="text-right py-2 px-3">중식</th>
                <th className="text-right py-2 px-3">석식</th>
                <th className="text-right py-2 px-3">합계</th>
                <th className="text-right py-2 px-3">금액</th>
              </tr>
            </thead>
            <tbody>
              {selected.items.map(item => (
                <tr key={item.id} className="border-b border-gray-800">
                  <td className="py-2 px-3">{item.employee_no}</td>
                  <td className="py-2 px-3">{item.employee_name}</td>
                  <td className="py-2 px-3 text-gray-400">{item.department ?? '-'}</td>
                  <td className="py-2 px-3 text-right">{item.breakfast_count}</td>
                  <td className="py-2 px-3 text-right">{item.lunch_count}</td>
                  <td className="py-2 px-3 text-right">{item.dinner_count}</td>
                  <td className="py-2 px-3 text-right font-medium">{item.usage_count}</td>
                  <td className="py-2 px-3 text-right">{item.total_amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/dashboard/settlements/page.tsx
git commit -m "feat: add settlements dashboard page"
```

---

## Phase 5: 설정 UI

### Task 13: settingsStore inputPolicy 초기값

**Files:**
- Modify: `lib/store/settingsStore.ts`

- [ ] **Step 1: 현재 파일 읽기**

`lib/store/settingsStore.ts`에서 `DeviceConfig` 기본값 위치 확인

- [ ] **Step 2: inputPolicy 초기값 추가**

`DeviceConfig` 기본값 객체에 추가:

```typescript
inputPolicy: {
  barcode: 'bizplay_payment',
  qr: 'bizplay_payment',
  rfcard: 'bizplay_payment',
},
```

- [ ] **Step 3: 커밋**

```bash
git add lib/store/settingsStore.ts
git commit -m "feat: add inputPolicy default to settingsStore"
```

---

### Task 14: PosConfigForm에 inputPolicy 설정 UI 추가

**Files:**
- Modify: `app/dashboard/terminals/[id]/PosConfigForm.tsx`

- [ ] **Step 1: 현재 파일 읽기**

`app/dashboard/terminals/[id]/PosConfigForm.tsx`에서 폼 구조 확인

- [ ] **Step 2: inputPolicy 섹션 추가**

폼 안에 다음 섹션 추가:

```tsx
{/* inputPolicy 설정 */}
<div className="space-y-3 pt-4 border-t border-gray-700">
  <h3 className="text-sm font-semibold text-gray-300">입력 타입별 동작 설정</h3>
  {(['barcode', 'qr', 'rfcard'] as const).map(inputType => (
    <div key={inputType} className="flex items-center gap-3">
      <label className="w-20 text-sm text-gray-400 capitalize">{inputType}</label>
      <select
        value={formData.inputPolicy?.[inputType] ?? 'bizplay_payment'}
        onChange={e => setFormData(prev => ({
          ...prev,
          inputPolicy: {
            ...(prev.inputPolicy ?? { barcode: 'bizplay_payment', qr: 'bizplay_payment', rfcard: 'bizplay_payment' }),
            [inputType]: e.target.value,
          },
        }))}
        className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm"
      >
        <option value="bizplay_payment">Bizplay 결제</option>
        <option value="meal_record">식수 기록</option>
        <option value="disabled">비활성화</option>
      </select>
    </div>
  ))}
</div>
```

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 타입 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/dashboard/terminals/[id]/PosConfigForm.tsx
git commit -m "feat: add inputPolicy settings UI to PosConfigForm"
```

---

### Task 15: 네비게이션 메뉴 추가 + 최종 빌드 검증

**Files:**
- Modify: `app/dashboard/NavItem.tsx` (또는 사이드바 nav 컴포넌트)

- [ ] **Step 1: 사이드바 nav에 항목 추가**

기존 네비게이션에 사원 관리 / 정산 항목 추가:

```tsx
// 기존 nav 항목들 뒤에 추가
<NavItem href="/dashboard/employees" label="사원 관리" />
<NavItem href="/dashboard/settlements" label="식수 정산" />
```

- [ ] **Step 2: 최종 빌드 확인**

```bash
npm run build
```

Expected: Build succeeded with no errors

- [ ] **Step 3: 최종 커밋**

```bash
git add app/dashboard/
git commit -m "feat: add employee/settlement nav items"
```

---

## 스펙 커버리지 체크

| 스펙 항목 | 구현 태스크 |
|---|---|
| inputPolicy 타입 (InputAction, InputPolicy) | Task 2 |
| handleScan 분기 | Task 7 |
| employees 테이블 | Task 1 |
| meal_usages 테이블 | Task 1 |
| settlements / settlement_items | Task 1 |
| terminals.input_policy, merchants.badge_settings | Task 1 |
| /api/meal/record | Task 5 |
| 끼니 자동 판별 | Task 3 |
| 사원 조회 (card_number/barcode) | Task 4 |
| 중복 정책 (block/warn/allow) | Task 5 |
| BadgeSuccessScreen, WarnScreen | Task 6 |
| mealRecord 클라이언트 헬퍼 | Task 6 |
| 사원 관리 API (CRUD + sync) | Task 8 |
| 사원 관리 대시보드 | Task 9 |
| 정산 API (생성/조회/확정/다운로드) | Task 10 |
| Excel 생성 | Task 11 |
| PDF 생성 | Task 11 |
| 정산 대시보드 | Task 12 |
| settingsStore 초기값 | Task 13 |
| PosConfigForm inputPolicy UI | Task 14 |
| 네비게이션 항목 | Task 15 |
| pg_cron 자동 정산 | Task 1 |

**범위 외 (보류)**: 청구서 이메일 발송, ERP 연동, 월 사용 횟수 한도 — 스펙에 명시된 대로 제외
