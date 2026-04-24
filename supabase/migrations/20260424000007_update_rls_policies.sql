-- Migration: 20260424000007_update_rls_policies.sql
-- Created: 2026-04-24

-- 1. 롤 검증을 위한 범용 함수 생성 (중복 롤 체크 방지 및 확장성)
CREATE OR REPLACE FUNCTION has_role(required_roles text[]) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM merchant_users
    WHERE user_id = auth.uid() AND role = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. 정책 업데이트: 기존 정책 삭제 후 9개 롤 체계 기반으로 재설정

-- Stores 정책
DROP POLICY IF EXISTS stores_select ON stores;
DROP POLICY IF EXISTS stores_manage ON stores;

CREATE POLICY "stores_select" ON stores FOR SELECT USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'merchant_admin', 'merchant_manager', 'store_admin', 'store_manager'])
);

CREATE POLICY "stores_manage" ON stores FOR ALL USING (
  has_role(ARRAY['platform_admin', 'merchant_admin', 'store_admin'])
);

-- Terminals 정책 (단말기)
DROP POLICY IF EXISTS terminals_select ON terminals;
DROP POLICY IF EXISTS terminals_manage ON terminals;

CREATE POLICY "terminals_select" ON terminals FOR SELECT USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'merchant_admin', 'merchant_manager', 'store_admin', 'store_manager', 'terminal_admin'])
);

CREATE POLICY "terminals_manage_lifecycle" ON terminals FOR ALL USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'terminal_admin'])
);

CREATE POLICY "terminals_manage_settings" ON terminals FOR UPDATE USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'terminal_admin', 'merchant_admin', 'merchant_manager', 'store_admin', 'store_manager'])
);
