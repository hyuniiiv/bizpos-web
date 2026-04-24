-- Migration: 20260424000006_create_role_permissions.sql
-- Created: 2026-04-24

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (
    role IN (
      'platform_admin', 'platform_manager',
      'merchant_admin', 'merchant_manager',
      'store_admin', 'store_manager',
      'terminal_admin',
      'client_admin', 'client_manager'
    )
  ),
  resource text NOT NULL CHECK (
    resource IN ('merchants', 'stores', 'clients', 'terminals', 'users')
  ),
  can_create boolean DEFAULT false,
  can_read boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, resource)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 읽기 가능, 수정은 platform_admin만 가능
CREATE POLICY "everyone_can_read_permissions" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "platform_admin_manage_permissions" ON role_permissions FOR ALL USING (is_platform_admin());
