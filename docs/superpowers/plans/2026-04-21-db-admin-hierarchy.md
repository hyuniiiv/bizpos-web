# DB Admin 계층 구조 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** merchants→stores→terminals 3단 계층과 clients 고객사 테이블을 추가하고, employees/meal_usages/settlements를 merchant_id에서 client_id 기반으로 전환한다.

**Architecture:** 단일 마이그레이션 파일(20260421000002)로 전체 스키마 변경을 적용한다. 기존 20260421000001의 employees 계열 테이블은 DROP 후 client_id 참조로 재생성한다(개발환경 전제). TypeScript 타입도 동일 커밋에서 업데이트한다.

**Tech Stack:** PostgreSQL, Supabase, TypeScript

---

## 파일 구조

| 파일 | 작업 |
|---|---|
| `supabase/migrations/20260421000002_admin_hierarchy.sql` | 신규 생성 |
| `types/menu.ts` | Employee·MealUsage·Settlement merchant_id → client_id; Store·Client·ClientUser 타입 추가 |
| `app/api/meal/record/route.ts` | employees 조회 시 merchant_id 제거 → client_id 역추적 |

---

### Task 1: 마이그레이션 파일 생성 및 실행

**Files:**
- Create: `supabase/migrations/20260421000002_admin_hierarchy.sql`

- [ ] **Step 1: 파일 작성**

```sql
-- ============================================================
-- Migration 20260421000002: Admin 계층 구조 재설계
-- 전제: 개발환경 (employees 계열 테이블 DROP 후 재생성)
-- ============================================================

-- 1. clients (고객사)
CREATE TABLE IF NOT EXISTS clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biz_no      text NOT NULL,
  client_name text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_biz_no ON clients(biz_no);

-- 2. stores (매장)
CREATE TABLE IF NOT EXISTS stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  store_name  text NOT NULL,
  biz_no      text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stores_merchant_id ON stores(merchant_id);

-- 3. client_users (고객사 포털 사용자)
CREATE TABLE IF NOT EXISTS client_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  client_id  uuid NOT NULL REFERENCES clients(id),
  role       text NOT NULL CHECK (role IN ('platform_client_admin', 'client_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

-- 4. store_managers (매장 매니저 배정)
CREATE TABLE IF NOT EXISTS store_managers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  store_id   uuid NOT NULL REFERENCES stores(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

-- 5. merchants.biz_no UNIQUE 제거
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_biz_no_key;
CREATE INDEX IF NOT EXISTS idx_merchants_biz_no ON merchants(biz_no);

-- 6. merchant_users.role 체계 변경
UPDATE merchant_users SET role = 'platform_store_admin' WHERE role = 'admin';
ALTER TABLE merchant_users DROP CONSTRAINT IF EXISTS merchant_users_role_check;
ALTER TABLE merchant_users
  ADD CONSTRAINT merchant_users_role_check
  CHECK (role IN ('platform_store_admin', 'store_owner', 'store_manager'));

-- 7. terminals.store_id 추가
ALTER TABLE terminals ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id);

-- 8. employees 계열 테이블 재생성 (client_id 참조)
DROP TABLE IF EXISTS settlement_items;
DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS meal_usages;
DROP TABLE IF EXISTS employees;

CREATE TABLE employees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id),
  employee_no   text NOT NULL,
  name          text NOT NULL,
  department    text,
  card_number   text,
  barcode       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, employee_no)
);
CREATE UNIQUE INDEX employees_client_card_unique
  ON employees (client_id, card_number) WHERE card_number IS NOT NULL;
CREATE UNIQUE INDEX employees_client_barcode_unique
  ON employees (client_id, barcode) WHERE barcode IS NOT NULL;

CREATE TABLE meal_usages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id),
  terminal_id   uuid NOT NULL REFERENCES terminals(id),
  employee_id   uuid NOT NULL REFERENCES employees(id),
  meal_type     text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  used_at       timestamptz NOT NULL DEFAULT now(),
  amount        integer NOT NULL DEFAULT 0,
  menu_id       text,
  synced        boolean NOT NULL DEFAULT true
);
CREATE INDEX meal_usages_employee_used ON meal_usages (employee_id, used_at);
CREATE INDEX meal_usages_client_used   ON meal_usages (client_id, used_at);

CREATE TABLE settlements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  total_count   integer NOT NULL DEFAULT 0,
  total_amount  integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at  timestamptz,
  CONSTRAINT valid_period CHECK (period_start <= period_end)
);

CREATE TABLE settlement_items (
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
CREATE INDEX settlement_items_settlement_id ON settlement_items (settlement_id);

-- 9. RLS 활성화
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_managers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_usages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

-- 10. RLS 헬퍼 함수
CREATE OR REPLACE FUNCTION is_platform_store_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM merchant_users
    WHERE user_id = auth.uid() AND role = 'platform_store_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_platform_client_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_users
    WHERE user_id = auth.uid() AND role = 'platform_client_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 11. RLS 정책

-- clients
CREATE POLICY clients_select ON clients FOR SELECT USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = clients.id)
);
CREATE POLICY clients_insert ON clients FOR INSERT WITH CHECK (is_platform_client_admin());
CREATE POLICY clients_update ON clients FOR UPDATE USING (is_platform_client_admin());

-- stores
CREATE POLICY stores_select ON stores FOR SELECT USING (
  is_platform_store_admin()
  OR EXISTS (
    SELECT 1 FROM merchant_users mu
    WHERE mu.user_id = auth.uid() AND mu.merchant_id = stores.merchant_id
  )
  OR EXISTS (SELECT 1 FROM store_managers sm WHERE sm.user_id = auth.uid() AND sm.store_id = stores.id)
);
CREATE POLICY stores_manage ON stores FOR ALL USING (is_platform_store_admin());

-- employees
CREATE POLICY employees_select ON employees FOR SELECT USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = employees.client_id)
);
CREATE POLICY employees_manage ON employees FOR ALL USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = employees.client_id)
);

-- meal_usages (조회만; INSERT는 단말기 토큰 기반 서비스키)
CREATE POLICY meal_usages_select ON meal_usages FOR SELECT USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = meal_usages.client_id)
);

-- settlements
CREATE POLICY settlements_all ON settlements FOR ALL USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = settlements.client_id)
);

-- settlement_items
CREATE POLICY settlement_items_select ON settlement_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM settlements s
    WHERE s.id = settlement_items.settlement_id
      AND (
        is_platform_client_admin()
        OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = s.client_id)
      )
  )
);
CREATE POLICY settlement_items_manage ON settlement_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM settlements s
    WHERE s.id = settlement_items.settlement_id AND is_platform_client_admin()
  )
);
```

- [ ] **Step 2: Supabase SQL 에디터에서 실행**

Supabase 대시보드 > SQL Editor에서 위 파일 내용 붙여넣고 실행한다.

- [ ] **Step 3: 실행 결과 검증**

```sql
-- 신규 테이블 존재 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clients','stores','client_users','store_managers')
ORDER BY table_name;
-- 예상: 4행 반환

-- merchant_users role 확인
SELECT DISTINCT role FROM merchant_users;
-- 예상: platform_store_admin

-- employees 컬럼 확인 (client_id 존재, merchant_id 없음)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'employees' ORDER BY ordinal_position;
-- 예상: id, client_id, employee_no, name, department, card_number, barcode, is_active, created_at

-- RLS 헬퍼 함수 확인
SELECT proname FROM pg_proc
WHERE proname IN ('is_platform_store_admin','is_platform_client_admin');
-- 예상: 2행 반환
```

Expected: 모두 통과

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260421000002_admin_hierarchy.sql
git commit -m "feat: add admin hierarchy migration (clients, stores, client_users, RLS)"
```

---

### Task 2: TypeScript 타입 업데이트

**Files:**
- Modify: `types/menu.ts:86-134`

- [ ] **Step 1: Employee 타입 수정**

`types/menu.ts`의 `Employee` 인터페이스에서 `merchant_id`를 `client_id`로 교체한다:

```typescript
export interface Employee {
  id: string
  client_id: string      // 변경: merchant_id → client_id
  employee_no: string
  name: string
  department?: string
  card_number?: string
  barcode?: string
  is_active: boolean
  created_at: string
}
```

- [ ] **Step 2: MealUsage 타입 수정**

```typescript
export interface MealUsage {
  id: string
  client_id: string      // 변경: merchant_id → client_id
  terminal_id: string
  employee_id: string
  meal_type: MealType
  used_at: string
  amount: number
  menu_id?: string
  synced: boolean
}
```

- [ ] **Step 3: Settlement 타입 수정**

```typescript
export interface Settlement {
  id: string
  client_id: string      // 변경: merchant_id → client_id
  period_start: string
  period_end: string
  total_count: number
  total_amount: number
  status: 'draft' | 'confirmed'
  created_at: string
  confirmed_at?: string
}
```

- [ ] **Step 4: Store, Client, ClientUser 타입 추가 (파일 끝에)**

```typescript
export interface Store {
  id: string
  merchant_id: string
  store_name: string
  biz_no?: string
  is_active: boolean
  created_at: string
}

export interface Client {
  id: string
  biz_no: string
  client_name: string
  is_active: boolean
  created_at: string
}

export interface ClientUser {
  id: string
  user_id: string
  client_id: string
  role: 'platform_client_admin' | 'client_admin'
  created_at: string
}
```

- [ ] **Step 5: 타입 체크 실행**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: 타입 오류가 있다면 `merchant_id` 참조 코드들에서 발생. 다음 Task에서 수정한다.

- [ ] **Step 6: Commit**

```bash
git add types/menu.ts
git commit -m "feat: update TypeScript types for client_id schema (Employee, MealUsage, Settlement)"
```

---

### Task 3: meal/record API 수정

**Files:**
- Modify: `app/api/meal/record/route.ts`

이 API는 단말기에서 바코드/RF카드 태깅 시 호출된다. 기존에 `merchant_id` 기반으로 employees를 조회했다면, 이제 `barcode`/`card_number`만으로 조회하고 `client_id`는 employees 레코드에서 가져온다.

- [ ] **Step 1: meal/record/route.ts 전체 내용 확인**

```bash
cat app/api/meal/record/route.ts
```

- [ ] **Step 2: employees 조회 부분 수정**

기존 코드에서 `merchant_id` 필터를 제거하고, 전체 employees에서 barcode/card_number로 조회한다:

```typescript
// 기존 패턴 (merchant_id 필터 있는 경우)
// const { data: employee } = await supabase
//   .from('employees')
//   .select('...')
//   .eq('merchant_id', terminal.merchant_id)
//   .or(`barcode.eq.${raw},card_number.eq.${raw}`)

// 변경 후: merchant_id 불필요 (employees는 이제 client_id 소속)
const { data: employee } = await supabase
  .from('employees')
  .select('id, client_id, name, department, is_active')
  .or(`barcode.eq.${raw},card_number.eq.${raw}`)
  .eq('is_active', true)
  .single()

if (!employee) {
  return NextResponse.json({ error: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
}
```

- [ ] **Step 3: meal_usages INSERT 수정**

```typescript
await supabase.from('meal_usages').insert({
  client_id: employee.client_id,   // employees에서 가져온 client_id
  terminal_id: terminalId,
  employee_id: employee.id,
  meal_type,
  amount: 0,                        // meal_record 모드: 결제 없음
})
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "meal/record" | head -10
```

Expected: 오류 없음

- [ ] **Step 5: Next.js 빌드 확인**

```bash
npx next build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` 또는 오류 없음

- [ ] **Step 6: Commit**

```bash
git add app/api/meal/record/route.ts
git commit -m "fix: update meal/record API to resolve client_id from employees"
```
