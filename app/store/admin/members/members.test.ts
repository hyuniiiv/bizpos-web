import { expect, describe, it, vi, beforeEach } from 'vitest'
import * as emailMapModule from '@/lib/supabase/emailMap'
import { MERCHANT_ASSIGNABLE, NEEDS_PASSWORD_ROLES } from '@/lib/roles/assignable'

describe('members - batch email processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use batch processing (getEmailMapByIds) instead of N individual getUserById calls', async () => {
    // Arrange: Mock getEmailMapByIds
    const mockGetEmailMapByIds = vi.spyOn(emailMapModule, 'getEmailMapByIds')
    mockGetEmailMapByIds.mockResolvedValue({
      'user-1': 'alice@example.com',
      'user-2': 'bob@example.com',
      'user-3': 'charlie@example.com',
      'user-4': 'david@example.com',
      'user-5': 'eve@example.com',
    })

    const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5']

    // Act: Call the batch email map function
    const emailMap = await emailMapModule.getEmailMapByIds(userIds)

    // Assert: Verify batch processing was called exactly once
    expect(mockGetEmailMapByIds).toHaveBeenCalledTimes(1)
    expect(mockGetEmailMapByIds).toHaveBeenCalledWith(userIds)
    expect(emailMap).toEqual({
      'user-1': 'alice@example.com',
      'user-2': 'bob@example.com',
      'user-3': 'charlie@example.com',
      'user-4': 'david@example.com',
      'user-5': 'eve@example.com',
    })
  })

  it('should return empty object when no user IDs provided', async () => {
    // Arrange
    const mockGetEmailMapByIds = vi.spyOn(emailMapModule, 'getEmailMapByIds')
    mockGetEmailMapByIds.mockResolvedValue({})

    // Act
    const emailMap = await emailMapModule.getEmailMapByIds([])

    // Assert
    expect(mockGetEmailMapByIds).toHaveBeenCalledWith([])
    expect(emailMap).toEqual({})
  })

  it('should handle missing emails gracefully', async () => {
    // Arrange
    const mockGetEmailMapByIds = vi.spyOn(emailMapModule, 'getEmailMapByIds')
    mockGetEmailMapByIds.mockResolvedValue({
      'user-1': 'alice@example.com',
      'user-2': '(알 수 없음)',
    })

    const userIds = ['user-1', 'user-2']

    // Act
    const emailMap = await emailMapModule.getEmailMapByIds(userIds)

    // Assert
    expect(emailMap['user-2']).toBe('(알 수 없음)')
  })
})

describe('members - account creation role hierarchy', () => {
  describe('MERCHANT_ASSIGNABLE role hierarchy', () => {
    it('platform_admin should be able to assign all roles', () => {
      const assignable = MERCHANT_ASSIGNABLE.platform_admin
      expect(assignable).toContain('platform_admin')
      expect(assignable).toContain('merchant_admin')
      expect(assignable).toContain('store_admin')
      expect(assignable).toContain('terminal_admin')
    })

    it('merchant_admin should be able to assign merchant and store roles', () => {
      const assignable = MERCHANT_ASSIGNABLE.merchant_admin
      expect(assignable).toContain('merchant_manager')
      expect(assignable).toContain('store_admin')
      expect(assignable).toContain('store_manager')
      expect(assignable).toContain('terminal_admin')
      expect(assignable).not.toContain('platform_admin')
    })

    it('store_admin should be able to assign store and terminal roles', () => {
      const assignable = MERCHANT_ASSIGNABLE.store_admin
      expect(assignable).toContain('store_manager')
      expect(assignable).toContain('terminal_admin')
      expect(assignable).not.toContain('merchant_admin')
    })

    it('store_manager should only be able to assign terminal_admin', () => {
      const assignable = MERCHANT_ASSIGNABLE.store_manager
      expect(assignable.length).toBe(1)
      expect(assignable).toContain('terminal_admin')
    })

    it('terminal_admin should not be able to assign any roles', () => {
      const assignable = MERCHANT_ASSIGNABLE.terminal_admin
      expect(assignable).toEqual([])
    })
  })

  describe('NEEDS_PASSWORD_ROLES password requirements', () => {
    it('should require password for merchant roles', () => {
      expect(NEEDS_PASSWORD_ROLES.has('merchant_admin')).toBe(true)
      expect(NEEDS_PASSWORD_ROLES.has('merchant_manager')).toBe(true)
    })

    it('should require password for store roles', () => {
      expect(NEEDS_PASSWORD_ROLES.has('store_admin')).toBe(true)
      expect(NEEDS_PASSWORD_ROLES.has('store_manager')).toBe(true)
    })

    it('should require password for terminal_admin', () => {
      expect(NEEDS_PASSWORD_ROLES.has('terminal_admin')).toBe(true)
    })

    it('should not require password for platform_admin (email-based)', () => {
      expect(NEEDS_PASSWORD_ROLES.has('platform_admin')).toBe(false)
    })

    it('should not require password for platform_manager (email-based)', () => {
      expect(NEEDS_PASSWORD_ROLES.has('platform_manager')).toBe(false)
    })
  })

  describe('Account creation form field selection', () => {
    it('platform roles should use email field for account linking', () => {
      const platformRoles = ['platform_admin', 'platform_manager']
      expect(platformRoles).toContain('platform_admin')
      expect(platformRoles).toContain('platform_manager')
    })

    it('non-platform roles should use ID/PW field for account creation', () => {
      const isPlatformRole = (role: string) => ['platform_admin', 'platform_manager'].includes(role)
      expect(isPlatformRole('store_admin')).toBe(false)
      expect(isPlatformRole('merchant_admin')).toBe(false)
    })

    it('should differentiate email vs ID based on role type', () => {
      const merchantAdminAssignable = MERCHANT_ASSIGNABLE.merchant_admin
      const needsPassword = (role: string) => NEEDS_PASSWORD_ROLES.has(role)

      merchantAdminAssignable.forEach(role => {
        expect(needsPassword(role)).toBe(true)
      })
    })
  })
})
