-- Migration 20260425000003: has_role_in_merchant 헬퍼 함수 추가
-- Phase 0-c: 신규 함수 (기존 정책 미변경, 향후 사용)
--
-- 목표: merchant 범위 내 role 검증을 함수화
-- 사용 사례: API 레이어에서 merchant 접근 제어
--
-- 함수 시그니처:
--   has_role_in_merchant(required_roles text[], target_merchant_id uuid) -> boolean
--
-- 예시:
--   SELECT has_role_in_merchant(ARRAY['store_admin', 'merchant_admin'], merchant_id)
--   FROM stores WHERE id = $1
--
-- 안전성: ✅ 신규 함수, 기존 정책/데이터 미영향
-- 롤백: DROP FUNCTION IF EXISTS

CREATE OR REPLACE FUNCTION has_role_in_merchant(
  required_roles text[],
  target_merchant_id uuid
) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM merchant_users
    WHERE user_id = auth.uid()
      AND role = ANY(required_roles)
      AND merchant_id = target_merchant_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION has_role_in_merchant IS
  'Check if current user has any of the required roles within a specific merchant context';
