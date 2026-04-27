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

export const canManageTerminalLifecycle = (role: Role | string): boolean => {
  return (
    role === ROLES.PLATFORM_ADMIN ||
    role === ROLES.PLATFORM_MANAGER ||
    role === ROLES.TERMINAL_ADMIN
  );
};

export const canUpdateTerminalSettings = (role: Role | string): boolean => {
  return (
    role === ROLES.PLATFORM_ADMIN ||
    role === ROLES.PLATFORM_MANAGER ||
    role === ROLES.TERMINAL_ADMIN ||
    role === ROLES.MERCHANT_ADMIN ||
    role === ROLES.MERCHANT_MANAGER ||
    role === ROLES.STORE_ADMIN ||
    role === ROLES.STORE_MANAGER
  );
};

export const canManageMembers = (role: Role | string): boolean => {
  return (
    role === ROLES.PLATFORM_ADMIN ||
    role === ROLES.PLATFORM_MANAGER ||
    role === ROLES.MERCHANT_ADMIN ||
    role === ROLES.MERCHANT_MANAGER ||
    role === ROLES.STORE_ADMIN
  );
};

export const canAssignRole = (role: Role | string, targetRole: Role | string): boolean => {
  if (role === ROLES.PLATFORM_ADMIN) return true;

  if (role === ROLES.PLATFORM_MANAGER) {
    return targetRole !== ROLES.PLATFORM_ADMIN && targetRole !== ROLES.PLATFORM_MANAGER;
  }

  if (role === ROLES.MERCHANT_ADMIN) {
    return (
      targetRole === ROLES.MERCHANT_MANAGER ||
      targetRole === ROLES.STORE_ADMIN ||
      targetRole === ROLES.STORE_MANAGER
    );
  }

  return false;
};
