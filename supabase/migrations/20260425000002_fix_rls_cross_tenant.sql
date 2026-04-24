-- Migration 20260425000002: RLS 정책 merchant_id 스코프 추가
-- Phase 0-b: additive with guard (기존 정책 강화, 동작 변경 최소화)
--
-- 목표: cross-tenant 누수 방지
-- 변경 대상: 5개 정책 (stores_select, stores_manage, terminals_select,
--                     terminals_manage_lifecycle, terminals_manage_settings)
--
-- 구체적 변경:
-- - has_role() 만으로는 merchant 격리 불가능
-- - merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
--   조건 추가하여 사용자의 merchant 범위 내로만 제어 가능하게 변경
--
-- 위험도: Medium (기존 RLS 정책 재정의)
-- 롤백: 기존 정책 SQL 다시 실행

-- 1. Stores 정책 강화
DROP POLICY IF EXISTS stores_select ON stores;
CREATE POLICY "stores_select" ON stores FOR SELECT USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'merchant_admin', 'merchant_manager', 'store_admin', 'store_manager'])
  AND (
    is_platform_admin()
    OR merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS stores_manage ON stores;
CREATE POLICY "stores_manage" ON stores FOR ALL USING (
  has_role(ARRAY['platform_admin', 'merchant_admin', 'store_admin'])
  AND (
    is_platform_admin()
    OR merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
  )
);

-- 2. Terminals 정책 강화
DROP POLICY IF EXISTS terminals_select ON terminals;
CREATE POLICY "terminals_select" ON terminals FOR SELECT USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'merchant_admin', 'merchant_manager', 'store_admin', 'store_manager', 'terminal_admin'])
  AND (
    is_platform_admin()
    OR merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS terminals_manage_lifecycle ON terminals;
CREATE POLICY "terminals_manage_lifecycle" ON terminals FOR ALL USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'terminal_admin'])
  AND (
    is_platform_admin()
    OR merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS terminals_manage_settings ON terminals;
CREATE POLICY "terminals_manage_settings" ON terminals FOR UPDATE USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'terminal_admin', 'merchant_admin', 'merchant_manager', 'store_admin', 'store_manager'])
  AND (
    is_platform_admin()
    OR merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
  )
);
