// lib/roles/permissions.ts

export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  PLATFORM_MANAGER: 'platform_manager',
  MERCHANT_ADMIN: 'merchant_admin',
  MERCHANT_MANAGER: 'merchant_manager',
  STORE_ADMIN: 'store_admin',
  STORE_MANAGER: 'store_manager',
  TERMINAL_ADMIN: 'terminal_admin',
  CLIENT_ADMIN: 'client_admin',
  CLIENT_MANAGER: 'client_manager',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * 단말기 라이프사이클(생성/삭제) 권한 확인
 */
export const canManageTerminalLifecycle = (role: string) => {
  return [
    ROLES.PLATFORM_ADMIN,
    ROLES.PLATFORM_MANAGER,
    ROLES.TERMINAL_ADMIN,
  ].includes(role);
};

/**
 * 단말기 설정 수정 권한 확인
 */
export const canUpdateTerminalSettings = (role: string) => {
  return [
    ROLES.PLATFORM_ADMIN,
    ROLES.PLATFORM_MANAGER,
    ROLES.TERMINAL_ADMIN,
    ROLES.MERCHANT_ADMIN,
    ROLES.MERCHANT_MANAGER,
    ROLES.STORE_ADMIN,
    ROLES.STORE_MANAGER,
  ].includes(role);
};
