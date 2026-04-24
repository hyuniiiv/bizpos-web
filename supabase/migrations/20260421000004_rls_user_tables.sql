-- Migration 20260421000004: merchant_users / client_users / store_managers RLS 정책 추가
-- merchant_users는 이전 마이그레이션에서 RLS 미활성화, client_users/store_managers는 활성화만 됨

-- ──────────────────────────────────────────────────────────────────────────────
-- 헬퍼 함수 (SECURITY DEFINER — RLS 자기참조 재귀 방지)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_merchant_id() RETURNS uuid AS $$
  SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_client_id() RETURNS uuid AS $$
  SELECT client_id FROM client_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- merchant_users
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE merchant_users ENABLE ROW LEVEL SECURITY;

-- SELECT: platform admin 전체, 그 외 같은 merchant 소속
DROP POLICY IF EXISTS mu_select ON merchant_users;
CREATE POLICY mu_select ON merchant_users FOR SELECT USING (
  is_platform_admin()
  OR merchant_id = get_my_merchant_id()
);

-- INSERT/UPDATE/DELETE: 같은 org 범위로 제한 (세부 권한은 API 레이어에서 처리)
DROP POLICY IF EXISTS mu_insert ON merchant_users;
CREATE POLICY mu_insert ON merchant_users FOR INSERT WITH CHECK (
  is_platform_admin()
  OR merchant_id = get_my_merchant_id()
);

DROP POLICY IF EXISTS mu_update ON merchant_users;
CREATE POLICY mu_update ON merchant_users FOR UPDATE USING (
  is_platform_admin()
  OR merchant_id = get_my_merchant_id()
);

DROP POLICY IF EXISTS mu_delete ON merchant_users;
CREATE POLICY mu_delete ON merchant_users FOR DELETE USING (
  is_platform_admin()
  OR merchant_id = get_my_merchant_id()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- client_users (RLS 이미 활성화됨, 정책만 추가)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS cu_select ON client_users;
CREATE POLICY cu_select ON client_users FOR SELECT USING (
  is_platform_client_admin()
  OR client_id = get_my_client_id()
);

DROP POLICY IF EXISTS cu_insert ON client_users;
CREATE POLICY cu_insert ON client_users FOR INSERT WITH CHECK (
  is_platform_client_admin()
  OR client_id = get_my_client_id()
);

DROP POLICY IF EXISTS cu_update ON client_users;
CREATE POLICY cu_update ON client_users FOR UPDATE USING (
  is_platform_client_admin()
  OR client_id = get_my_client_id()
);

DROP POLICY IF EXISTS cu_delete ON client_users;
CREATE POLICY cu_delete ON client_users FOR DELETE USING (
  is_platform_client_admin()
  OR client_id = get_my_client_id()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- store_managers (RLS 이미 활성화됨, 정책만 추가)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS sm_select ON store_managers;
CREATE POLICY sm_select ON store_managers FOR SELECT USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = store_managers.store_id
      AND s.merchant_id = get_my_merchant_id()
  )
);

DROP POLICY IF EXISTS sm_insert ON store_managers;
CREATE POLICY sm_insert ON store_managers FOR INSERT WITH CHECK (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = store_managers.store_id
      AND s.merchant_id = get_my_merchant_id()
  )
);

DROP POLICY IF EXISTS sm_delete ON store_managers;
CREATE POLICY sm_delete ON store_managers FOR DELETE USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = store_managers.store_id
      AND s.merchant_id = get_my_merchant_id()
  )
);
