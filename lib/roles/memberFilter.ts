import { Role, ROLES } from './permissions'

interface Member {
  id: string
  role: string
  [key: string]: any
}

export function filterMembersByRole<T extends Member>(members: T[], userRole: Role | string): T[] {
  // Platform roles can see all members
  if ([ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(userRole as any)) {
    return members
  }

  // Merchant roles can see merchant and store members
  if ([ROLES.MERCHANT_ADMIN, ROLES.MERCHANT_MANAGER].includes(userRole as any)) {
    return members.filter(m =>
      [ROLES.MERCHANT_ADMIN, ROLES.MERCHANT_MANAGER, ROLES.STORE_ADMIN, ROLES.STORE_MANAGER].includes(
        m.role as any
      )
    )
  }

  // Store roles can see only store members
  if ([ROLES.STORE_ADMIN, ROLES.STORE_MANAGER].includes(userRole as any)) {
    return members.filter(m => [ROLES.STORE_ADMIN, ROLES.STORE_MANAGER].includes(m.role as any))
  }

  // Other roles cannot see members
  return []
}
