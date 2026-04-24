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
export const canManageTerminalLifecycle = (role: Role | string) => {
  return [
    ROLES.PLATFORM_ADMIN,
    ROLES.PLATFORM_MANAGER,
    ROLES.TERMINAL_ADMIN,
  ].includes(role as any);
};

/**
 * 단말기 설정 수정 권한 확인
 */
export const canUpdateTerminalSettings = (role: Role | string) => {
  return [
    ROLES.PLATFORM_ADMIN,
    ROLES.PLATFORM_MANAGER,
    ROLES.TERMINAL_ADMIN,
    ROLES.MERCHANT_ADMIN,
    ROLES.MERCHANT_MANAGER,
    ROLES.STORE_ADMIN,
    ROLES.STORE_MANAGER,
  ].includes(role as any);
};

/**
 * 멤버 관리 권한 확인
 */
export const canManageMembers = (role: Role | string) => {
  return [
    ROLES.PLATFORM_ADMIN,
    ROLES.PLATFORM_MANAGER,
    ROLES.MERCHANT_ADMIN,
    ROLES.MERCHANT_MANAGER,
    ROLES.STORE_ADMIN,
  ].includes(role as any);
};

/**
 * 역할 부여 권한 확인
 */
export const canAssignRole = (role: Role | string, targetRole: Role | string) => {
  const assigner = role as Role;
  const target = targetRole as Role;

  // Platform admin can assign any role
  if (assigner === ROLES.PLATFORM_ADMIN) return true;

  // Platform manager can assign non-platform roles
  if (assigner === ROLES.PLATFORM_MANAGER) {
    return ![ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(target as any);
  }

  // Merchant admin can assign merchant and store roles
  if (assigner === ROLES.MERCHANT_ADMIN) {
    return [
      ROLES.MERCHANT_MANAGER,
      ROLES.STORE_ADMIN,
      ROLES.STORE_MANAGER,
    ].includes(target as any);
  }

  // Others cannot assign roles
  return false;
};
