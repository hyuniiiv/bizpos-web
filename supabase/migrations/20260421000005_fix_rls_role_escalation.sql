-- Migration 20260421000005: RLS UPDATE 정책에 WITH CHECK 추가 (역할 승격 취약점 패치)
-- CRITICAL: 브라우저 anon 클라이언트로 직접 role 컬럼 변경 불가능하도록 봉쇄

-- ──────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER 헬퍼 (현재 role 값 조회 — RLS 재귀 방지)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_mu_role_by_id(p_id uuid) RETURNS text AS $$
  SELECT role FROM merchant_users WHERE id = p_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_cu_role_by_id(p_id uuid) RETURNS text AS $$
  SELECT role FROM client_users WHERE id = p_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ──────────────────────────────────────────────────────────────────────────────
-- merchant_users UPDATE 재생성 (WITH CHECK 추가)
-- 역할 변경은 service_role(admin client) 경유 API Route에서만 허용
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS mu_update ON merchant_users;
CREATE POLICY mu_update ON merchant_users FOR UPDATE
  USING (
    is_platform_admin()
    OR merchant_id = get_my_merchant_id()
  )
  WITH CHECK (
    is_platform_admin()
    OR (
      merchant_id = get_my_merchant_id()
      -- 비플랫폼 사용자는 role 컬럼을 변경할 수 없음 (현재값과 동일해야 통과)
      AND role = get_mu_role_by_id(id)
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- client_users UPDATE 재생성 (WITH CHECK 추가)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS cu_update ON client_users;
CREATE POLICY cu_update ON client_users FOR UPDATE
  USING (
    is_platform_client_admin()
    OR client_id = get_my_client_id()
  )
  WITH CHECK (
    is_platform_client_admin()
    OR (
      client_id = get_my_client_id()
      AND role = get_cu_role_by_id(id)
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- store_managers: UPDATE 정책 없음 — 의도적 생략
-- 수정이 필요한 경우 DELETE + INSERT 패턴 사용
-- ──────────────────────────────────────────────────────────────────────────────
