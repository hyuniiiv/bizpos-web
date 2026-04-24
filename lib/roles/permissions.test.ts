import { expect, describe, it } from 'vitest'
import { ROLES, canManageMembers, canAssignRole } from './permissions'

describe('permissions - member management', () => {
  describe('canManageMembers', () => {
    it('platform_admin can manage members', () => {
      expect(canManageMembers(ROLES.PLATFORM_ADMIN)).toBe(true)
    })

    it('platform_manager can manage members', () => {
      expect(canManageMembers(ROLES.PLATFORM_MANAGER)).toBe(true)
    })

    it('merchant_admin can manage members', () => {
      expect(canManageMembers(ROLES.MERCHANT_ADMIN)).toBe(true)
    })

    it('merchant_manager can manage members', () => {
      expect(canManageMembers(ROLES.MERCHANT_MANAGER)).toBe(true)
    })

    it('store_admin can manage members', () => {
      expect(canManageMembers(ROLES.STORE_ADMIN)).toBe(true)
    })

    it('store_manager cannot manage members', () => {
      expect(canManageMembers(ROLES.STORE_MANAGER)).toBe(false)
    })

    it('terminal_admin cannot manage members', () => {
      expect(canManageMembers(ROLES.TERMINAL_ADMIN)).toBe(false)
    })

    it('client_admin cannot manage members', () => {
      expect(canManageMembers(ROLES.CLIENT_ADMIN)).toBe(false)
    })

    it('client_manager cannot manage members', () => {
      expect(canManageMembers(ROLES.CLIENT_MANAGER)).toBe(false)
    })
  })

  describe('canAssignRole', () => {
    it('platform_admin can assign any role', () => {
      expect(canAssignRole(ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN)).toBe(true)
      expect(canAssignRole(ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_MANAGER)).toBe(true)
      expect(canAssignRole(ROLES.PLATFORM_ADMIN, ROLES.STORE_ADMIN)).toBe(true)
    })

    it('platform_manager can assign roles except platform roles', () => {
      expect(canAssignRole(ROLES.PLATFORM_MANAGER, ROLES.MERCHANT_ADMIN)).toBe(true)
      expect(canAssignRole(ROLES.PLATFORM_MANAGER, ROLES.STORE_MANAGER)).toBe(true)
      expect(canAssignRole(ROLES.PLATFORM_MANAGER, ROLES.PLATFORM_ADMIN)).toBe(false)
    })

    it('merchant_admin can assign merchant and store roles', () => {
      expect(canAssignRole(ROLES.MERCHANT_ADMIN, ROLES.MERCHANT_MANAGER)).toBe(true)
      expect(canAssignRole(ROLES.MERCHANT_ADMIN, ROLES.STORE_ADMIN)).toBe(true)
      expect(canAssignRole(ROLES.MERCHANT_ADMIN, ROLES.PLATFORM_ADMIN)).toBe(false)
    })

    it('merchant_manager cannot assign roles', () => {
      expect(canAssignRole(ROLES.MERCHANT_MANAGER, ROLES.STORE_MANAGER)).toBe(false)
    })

    it('store_admin cannot assign roles', () => {
      expect(canAssignRole(ROLES.STORE_ADMIN, ROLES.STORE_MANAGER)).toBe(false)
    })
  })
})
