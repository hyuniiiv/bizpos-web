-- Migration 20260508000001: platform_client_admin 역할을 platform_admin으로 통합
-- platform_admin이 매장 포털 + 고객사 포털 모두 슈퍼유저로 작동
-- platform_client_admin은 신규 배정 불가, 기존 계정은 platform_admin으로 승격

-- 1. 기존 platform_client_admin 유저의 app_metadata.role을 platform_admin으로 승격
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"platform_admin"'
)
WHERE id IN (
  SELECT user_id FROM client_users WHERE role = 'platform_client_admin'
);

-- 2. platform_client_admin 레코드 삭제 (app_metadata로 대체됨)
DELETE FROM client_users WHERE role = 'platform_client_admin';

-- 3. CHECK constraint에서 platform_client_admin 제거
ALTER TABLE client_users DROP CONSTRAINT IF EXISTS client_users_role_check;
ALTER TABLE client_users
  ADD CONSTRAINT client_users_role_check
  CHECK (role IN ('client_admin', 'client_operator'));

-- 4. is_platform_client_admin() 함수를 platform_admin app_metadata도 인식하도록 업데이트
--    (RLS 정책이 이 함수를 사용하므로 app_metadata.role = 'platform_admin'도 허용)
CREATE OR REPLACE FUNCTION is_platform_client_admin() RETURNS boolean AS $$
  SELECT
    -- 기존 client_users 경로 (backward compat)
    EXISTS (
      SELECT 1 FROM client_users
      WHERE user_id = auth.uid() AND role = 'platform_client_admin'
    )
    OR
    -- platform_admin app_metadata 경로 (통합 후 신규 방식)
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin';
$$ LANGUAGE sql SECURITY DEFINER;
