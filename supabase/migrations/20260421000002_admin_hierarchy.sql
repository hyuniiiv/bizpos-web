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
-- 기존 role 매핑: admin → platform_admin, 호환되지 않는 role → store_owner
UPDATE merchant_users SET role = 'platform_admin' WHERE role = 'admin';
UPDATE merchant_users SET role = 'store_owner' WHERE role NOT IN ('platform_admin', 'store_owner', 'store_manager');
ALTER TABLE merchant_users DROP CONSTRAINT IF EXISTS merchant_users_role_check;
ALTER TABLE merchant_users
  ADD CONSTRAINT merchant_users_role_check
  CHECK (role IN ('platform_admin', 'store_owner', 'store_manager'));

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
CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM merchant_users
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_platform_client_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_users
    WHERE user_id = auth.uid() AND role = 'platform_client_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 11. RLS 정책 (DROP IF EXISTS로 재실행 가능하게)

-- clients
DROP POLICY IF EXISTS clients_select ON clients;
CREATE POLICY clients_select ON clients FOR SELECT USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = clients.id)
);
DROP POLICY IF EXISTS clients_insert ON clients;
CREATE POLICY clients_insert ON clients FOR INSERT WITH CHECK (is_platform_client_admin());
DROP POLICY IF EXISTS clients_update ON clients;
CREATE POLICY clients_update ON clients FOR UPDATE USING (is_platform_client_admin());

-- stores
DROP POLICY IF EXISTS stores_select ON stores;
CREATE POLICY stores_select ON stores FOR SELECT USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM merchant_users mu
    WHERE mu.user_id = auth.uid() AND mu.merchant_id = stores.merchant_id
  )
  OR EXISTS (SELECT 1 FROM store_managers sm WHERE sm.user_id = auth.uid() AND sm.store_id = stores.id)
);
DROP POLICY IF EXISTS stores_manage ON stores;
CREATE POLICY stores_manage ON stores FOR ALL USING (is_platform_admin());

-- employees
DROP POLICY IF EXISTS employees_select ON employees;
CREATE POLICY employees_select ON employees FOR SELECT USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = employees.client_id)
);
DROP POLICY IF EXISTS employees_manage ON employees;
CREATE POLICY employees_manage ON employees FOR ALL USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = employees.client_id)
);

-- meal_usages (조회만; INSERT는 단말기 토큰 기반 서비스키)
DROP POLICY IF EXISTS meal_usages_select ON meal_usages;
CREATE POLICY meal_usages_select ON meal_usages FOR SELECT USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = meal_usages.client_id)
);

-- settlements
DROP POLICY IF EXISTS settlements_all ON settlements;
CREATE POLICY settlements_all ON settlements FOR ALL USING (
  is_platform_client_admin()
  OR EXISTS (SELECT 1 FROM client_users cu WHERE cu.user_id = auth.uid() AND cu.client_id = settlements.client_id)
);

-- settlement_items
DROP POLICY IF EXISTS settlement_items_select ON settlement_items;
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
DROP POLICY IF EXISTS settlement_items_manage ON settlement_items;
CREATE POLICY settlement_items_manage ON settlement_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM settlements s
    WHERE s.id = settlement_items.settlement_id AND is_platform_client_admin()
  )
);
