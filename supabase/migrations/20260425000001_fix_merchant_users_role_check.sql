-- Migration 20260425000001: merchant_users role CHECK 확장 (3개 → 9개)
-- Phase 0-a: additive, reversible
--
-- 변경:
-- - platform_admin, store_owner, store_manager (3개)
-- + platform_admin, platform_manager, merchant_admin, merchant_manager,
--   store_admin, store_manager, terminal_admin (7개)
--
-- 안전성: ✅ 현재 데이터에 영향 없음 (기존 role 모두 9개 내포)
-- Rollback: DROP CONSTRAINT + ADD CONSTRAINT로 복원 가능

ALTER TABLE merchant_users DROP CONSTRAINT IF EXISTS merchant_users_role_check;

ALTER TABLE merchant_users
  ADD CONSTRAINT merchant_users_role_check
  CHECK (role IN (
    'platform_admin', 'platform_manager',
    'merchant_admin', 'merchant_manager',
    'store_admin', 'store_manager',
    'terminal_admin'
  ));
