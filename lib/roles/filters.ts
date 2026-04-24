import type { Role } from './permissions'
import { ROLES } from './permissions'

export function filterMerchants<T extends { id: string }>(
  merchants: T[],
  userRole: Role | null,
  userMerchantId: string | null
): T[] {
  if (!userRole || !merchants.length) return []

  const isPlatform = [ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(userRole as any)
  if (isPlatform) return merchants

  const isMerchant = [ROLES.MERCHANT_ADMIN, ROLES.MERCHANT_MANAGER].includes(userRole as any)
  if (isMerchant && userMerchantId) {
    return merchants.filter(m => m.id === userMerchantId)
  }

  return []
}

export function filterStores<T extends { id: string; merchant_id: string }>(
  stores: T[],
  userRole: Role | null,
  userMerchantId: string | null,
  assignedStoreIds: string[]
): T[] {
  if (!userRole || !stores.length) return []

  const isPlatform = [ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(userRole as any)
  if (isPlatform) return stores

  const isMerchant = [ROLES.MERCHANT_ADMIN, ROLES.MERCHANT_MANAGER].includes(userRole as any)
  if (isMerchant && userMerchantId) {
    return stores.filter(s => s.merchant_id === userMerchantId)
  }

  const isStore = [ROLES.STORE_ADMIN, ROLES.STORE_MANAGER].includes(userRole as any)
  if (isStore && assignedStoreIds.length > 0) {
    return stores.filter(s => assignedStoreIds.includes(s.id))
  }

  return []
}

export function getAssignableRoles(userRole: Role | null): Role[] {
  if (!userRole) return []

  switch (userRole) {
    case ROLES.PLATFORM_ADMIN:
      return Object.values(ROLES) as Role[]
    case ROLES.MERCHANT_ADMIN:
    case ROLES.MERCHANT_MANAGER:
      return [
        ROLES.MERCHANT_MANAGER,
        ROLES.STORE_ADMIN,
        ROLES.STORE_MANAGER,
        ROLES.TERMINAL_ADMIN,
      ]
    case ROLES.STORE_ADMIN:
    case ROLES.STORE_MANAGER:
      return [ROLES.TERMINAL_ADMIN]
    default:
      return []
  }
}
