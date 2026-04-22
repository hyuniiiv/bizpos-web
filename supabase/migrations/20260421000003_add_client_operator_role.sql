-- Migration 20260421000003: client_users 에 고객사운영자(client_operator) 역할 추가

ALTER TABLE client_users DROP CONSTRAINT IF EXISTS client_users_role_check;
ALTER TABLE client_users
  ADD CONSTRAINT client_users_role_check
  CHECK (role IN ('platform_client_admin', 'client_admin', 'client_operator'));
