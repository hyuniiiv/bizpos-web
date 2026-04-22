# Admin 계층 구조 및 고객사 포털 — 설계 문서

**작성일**: 2026-04-21  
**상태**: 승인됨  
**범위**: DB 계층 재설계 + 3개 포털 분리 + 역할 기반 접근 제어

---

## 1. 개요

기존 단일 `merchants` 계층을 `merchants → stores → terminals` 3단 계층으로 확장하고,  
고객사(`clients`)를 분리하여 3개 포털로 운영한다.

| 포털 | URL | 인증 방식 | 대상 역할 |
|---|---|---|---|
| POS 관리 | `/pos/admin` | PIN | infra_admin (DB 역할 없음) |
| 매장 포털 | `/store/admin` | Supabase Auth | platform_store_admin, store_owner, store_manager |
| 고객사 포털 | `/client/admin` | Supabase Auth | platform_client_admin, client_admin |

> **연계**: 이 문서는 `2026-04-21-badge-meal-settlement-design.md`에서 설계한  
> `employees / meal_usages / settlements`의 `merchant_id`를 `client_id`로 교체하는 것을 포함한다.

---

## 2. 핵심 설계 원칙 — 고객사 중심 식수 관리

```
태깅 가능 조건: employees 테이블에 client_id 소속으로 등록된 사원만 태깅 가능
태깅 이력 귀속: meal_usages.client_id → 고객사별 이력 적재
정산 기준:      settlements.client_id → 고객사별 집계 및 정산서 생성
```

매장 체인(`terminal_id → stores → merchants`)과 고객사 체인(`client_id → clients`)은  
`meal_usages`에서 교차하며, 별도 연결 테이블 없이 간접 연결된다.

---

## 3. DB 스키마 변경

### 3.1 기존 테이블 수정

#### `merchants` — biz_no UNIQUE 제거 (N개 사업자 허용)
```sql
ALTER TABLE merchants
  DROP CONSTRAINT IF EXISTS merchants_biz_no_key;
CREATE INDEX IF NOT EXISTS idx_merchants_biz_no ON merchants(biz_no);
```

#### `terminals` — store_id 추가
```sql
ALTER TABLE terminals
  ADD COLUMN store_id UUID REFERENCES stores(id);  -- nullable (점진적 마이그레이션)
```

#### `merchant_users` — role 체계 변경
```sql
UPDATE merchant_users
  SET role = 'platform_store_admin'
  WHERE role = 'admin';

ALTER TABLE merchant_users
  DROP CONSTRAINT IF EXISTS merchant_users_role_check,
  ADD CONSTRAINT merchant_users_role_check CHECK (
    role IN (
      'platform_store_admin',   -- 매장 포털 전용 역할만
      'store_owner',
      'store_manager'
    )
  );
-- 고객사 역할(platform_client_admin, client_admin)은 client_users 테이블에서만 관리
```

#### `employees` / `meal_usages` / `settlements` — merchant_id → client_id
```sql
-- 개발환경: DROP 후 재생성 (badge-meal-settlement 마이그레이션 수정)
ALTER TABLE employees
  DROP COLUMN merchant_id,
  ADD COLUMN client_id UUID NOT NULL REFERENCES clients(id);

ALTER TABLE meal_usages
  DROP COLUMN merchant_id,
  ADD COLUMN client_id UUID NOT NULL REFERENCES clients(id);

ALTER TABLE settlements
  DROP COLUMN merchant_id,
  ADD COLUMN client_id UUID NOT NULL REFERENCES clients(id);
```

### 3.2 신규 테이블

#### `stores` — 매장 (merchants 하위)
```sql
CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  store_name  TEXT NOT NULL,
  biz_no      TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stores_merchant_id ON stores(merchant_id);
```

#### `clients` — 고객사
```sql
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biz_no      TEXT NOT NULL,               -- UNIQUE 없음 (N개 레코드 허용)
  client_name TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_biz_no ON clients(biz_no);
```

#### `client_users` — 고객사 포털 사용자
```sql
CREATE TABLE client_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  client_id  UUID NOT NULL REFERENCES clients(id),
  role       TEXT NOT NULL CHECK (role IN ('platform_client_admin', 'client_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
```

#### `store_managers` — 매장 매니저 배정 (store_manager role 전용)
```sql
CREATE TABLE store_managers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  store_id   UUID NOT NULL REFERENCES stores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);
```

---

## 4. 계층 구조

```
merchants (사업자등록번호 기반, N개 허용)
  └── stores (매장, N개)
        └── terminals (단말기, N개)

clients (고객사, N개 허용 / 사업자등록번호 기반)
  └── employees (사원, client_id 소속 → 태깅 조건)
        └── meal_usages (태깅 이력, client_id 귀속)
              └── settlements / settlement_items (고객사별 정산)
```

---

## 5. 역할별 접근 권한

| 역할 | 포털 | 접근 범위 | 주요 기능 |
|---|---|---|---|
| infra_admin | /pos/admin | PIN 기반 | 단말기 상태/메뉴/거래/설정 |
| platform_store_admin | /store/admin | 전체 merchants + clients | 매장/단말기/고객사 전체 관리 |
| store_owner | /store/admin | 본인 merchant 전체 stores | 매장·단말기 설정·매출 |
| store_manager | /store/admin | 배정된 stores만 | 매출·거래내역 조회 |
| platform_client_admin | /client/admin | 전체 clients | 고객사 생성·사원·정산 전체 |
| client_admin | /client/admin | 본인 client만 | 사원 관리·식수이력·정산 |

---

## 6. RLS 전략

```sql
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

-- stores RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_select ON stores FOR SELECT USING (
  is_platform_store_admin()
  OR EXISTS (
    SELECT 1 FROM merchant_users mu
    WHERE mu.user_id = auth.uid()
      AND mu.merchant_id = stores.merchant_id
      AND mu.role = 'store_owner'
  )
  OR EXISTS (
    SELECT 1 FROM store_managers sm
    WHERE sm.user_id = auth.uid() AND sm.store_id = stores.id
  )
);

-- clients RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_select ON clients FOR SELECT USING (
  is_platform_client_admin()
  OR EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid() AND cu.client_id = clients.id
  )
);

-- meal_usages RLS (고객사 관리자는 본인 client 이력만)
ALTER TABLE meal_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY meal_usages_select ON meal_usages FOR SELECT USING (
  is_platform_client_admin()
  OR EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid() AND cu.client_id = meal_usages.client_id
  )
);
```

---

## 7. 포털별 URL 구조

### 7.1 `/pos/admin` — 기존 유지

`app/pos/admin/page.tsx` 유지. PIN 기반, Supabase Auth 불필요.

### 7.2 `/store/admin` — 기존 dashboard 리팩토링

```
app/store/admin/
├── layout.tsx           -- Auth guard (merchant_users)
├── page.tsx             -- 대시보드 (매출 요약)
├── merchants/           -- platform_store_admin 전용
│   ├── page.tsx
│   └── [id]/page.tsx
├── stores/
│   ├── page.tsx
│   └── [id]/page.tsx    -- 매장 상세 + 단말기 목록
├── terminals/
│   └── [id]/page.tsx    -- 단말기 설정 (기존 이동)
├── transactions/
├── analytics/
├── alerts/
└── settings/
```

### 7.3 `/client/admin` — 신규

```
app/client/admin/
├── layout.tsx           -- Auth guard (client_users)
├── page.tsx             -- 대시보드 (식수 현황)
├── clients/             -- platform_client_admin 전용
│   ├── page.tsx
│   └── [id]/page.tsx
├── employees/           -- 사원 관리 (태깅 조건 — 미등록 사원은 태깅 불가)
│   ├── page.tsx         -- 목록 + CSV 업로드
│   └── [id]/page.tsx
├── usages/              -- 태깅 이력 (client_id 기준)
└── settlements/         -- 정산 (client_id 기준, PDF/Excel)
```

---

## 8. 사원증 식수 태깅 흐름

```
전제: employees 테이블에 해당 사원이 client_id 소속으로 등록되어 있어야 함

단말기 (inputPolicy.barcode = 'meal_record' — 결제 없음)
  ↓ 바코드/RF카드 스캔
handleMealRecord(raw, type)
  ↓ POST /api/meal/record
서버
  1. employees에서 barcode 또는 card_number 매칭
     → 미등록: EMPLOYEE_NOT_FOUND (태깅 불가)
  2. employees.client_id → clients 조회 (고객사 확인)
  3. dup_policy 체크 (meal_usages 당일 동일 끼니)
  4. meal_usages INSERT {
       employee_id,
       terminal_id,   -- 매장 체인
       client_id,     -- 고객사 체인 (이력 귀속, 정산 기준)
       meal_type,
       amount: 0      -- 결제 없음 (또는 메뉴 단가)
     }
  5. 응답: { ok: true, employee: { name, department }, meal_type }
단말기 → BadgeSuccessScreen (3초 후 복귀)
```

---

## 9. 마이그레이션 순서 (개발환경)

```sql
-- Step 1: 신규 테이블 생성 (clients 먼저, 이후 참조 테이블)
CREATE TABLE stores (...);
CREATE TABLE clients (...);
CREATE TABLE client_users (...);
CREATE TABLE store_managers (...);

-- Step 2: 기존 테이블 변경
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_biz_no_key;
ALTER TABLE terminals ADD COLUMN store_id UUID REFERENCES stores(id);
UPDATE merchant_users SET role = 'platform_store_admin' WHERE role = 'admin';
ALTER TABLE merchant_users ADD CONSTRAINT merchant_users_role_check CHECK (...);

-- Step 3: badge-meal-settlement 테이블 재생성 (client_id 참조)
DROP TABLE IF EXISTS settlement_items, settlements, meal_usages, employees;
-- badge-meal-settlement 마이그레이션 파일 수정 후 재실행

-- Step 4: RLS 헬퍼 함수 + 정책 적용
```

---

## 10. 파일 목록

### 신규
```
app/store/admin/layout.tsx
app/store/admin/page.tsx
app/store/admin/merchants/page.tsx
app/store/admin/merchants/[id]/page.tsx
app/store/admin/stores/page.tsx
app/store/admin/stores/[id]/page.tsx
app/client/admin/layout.tsx
app/client/admin/page.tsx
app/client/admin/clients/page.tsx
app/client/admin/clients/[id]/page.tsx
app/client/admin/employees/page.tsx
app/client/admin/usages/page.tsx
app/client/admin/settlements/page.tsx
supabase/migrations/20260421000002_admin_hierarchy.sql
```

### 변경
```
app/dashboard/ → app/store/admin/ (점진적 이전)
supabase/migrations/20260421000001_badge_meal_settlement.sql (client_id 교체)
supabase/schema.sql
```

---

## 11. 범위 외 (보류)

- 매장 매니저 초대 이메일 플로우
- 고객사 포털 다국어 지원
- 단말기 ↔ 매장 자동 배정 로직
- 고객사별 식수 한도 설정
