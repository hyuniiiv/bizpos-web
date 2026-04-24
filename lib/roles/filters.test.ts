import { describe, it, expect } from 'vitest'
import { filterMerchants, filterStores, getAssignableRoles } from './filters'
import { ROLES } from './permissions'

describe('Role-based Filtering', () => {
  describe('filterMerchants', () => {
    const merchants = [
      { id: 'merchant-1', name: 'Test 1' },
      { id: 'merchant-2', name: 'Test 2' },
    ]

    it('should return all merchants for platform_admin', () => {
      const result = filterMerchants(merchants, ROLES.PLATFORM_ADMIN, null)
      expect(result).toHaveLength(2)
    })

    it('should return all merchants for platform_manager', () => {
      const result = filterMerchants(merchants, ROLES.PLATFORM_MANAGER, null)
      expect(result).toHaveLength(2)
    })

    it('should return own merchant for merchant_admin', () => {
      const result = filterMerchants(merchants, ROLES.MERCHANT_ADMIN, 'merchant-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('merchant-1')
    })

    it('should return own merchant for merchant_manager', () => {
      const result = filterMerchants(merchants, ROLES.MERCHANT_MANAGER, 'merchant-2')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('merchant-2')
    })

    it('should return empty for store_admin', () => {
      const result = filterMerchants(merchants, ROLES.STORE_ADMIN, null)
      expect(result).toHaveLength(0)
    })

    it('should return empty for store_manager', () => {
      const result = filterMerchants(merchants, ROLES.STORE_MANAGER, null)
      expect(result).toHaveLength(0)
    })

    it('should return empty for terminal_admin', () => {
      const result = filterMerchants(merchants, ROLES.TERMINAL_ADMIN, null)
      expect(result).toHaveLength(0)
    })

    it('should return empty array when merchants list is empty', () => {
      const result = filterMerchants([], ROLES.PLATFORM_ADMIN, null)
      expect(result).toHaveLength(0)
    })

    it('should return empty array when role is null', () => {
      const result = filterMerchants(merchants, null, null)
      expect(result).toHaveLength(0)
    })
  })

  describe('filterStores', () => {
    const stores = [
      { id: 'store-1', merchant_id: 'merchant-1' },
      { id: 'store-2', merchant_id: 'merchant-1' },
      { id: 'store-3', merchant_id: 'merchant-2' },
    ]

    it('should return all stores for platform_admin', () => {
      const result = filterStores(stores, ROLES.PLATFORM_ADMIN, null, [])
      expect(result).toHaveLength(3)
    })

    it('should return all stores for platform_manager', () => {
      const result = filterStores(stores, ROLES.PLATFORM_MANAGER, null, [])
      expect(result).toHaveLength(3)
    })

    it('should return merchant stores for merchant_admin', () => {
      const result = filterStores(stores, ROLES.MERCHANT_ADMIN, 'merchant-1', [])
      expect(result).toHaveLength(2)
      expect(result.every(s => s.merchant_id === 'merchant-1')).toBe(true)
    })

    it('should return merchant stores for merchant_manager', () => {
      const result = filterStores(stores, ROLES.MERCHANT_MANAGER, 'merchant-2', [])
      expect(result).toHaveLength(1)
      expect(result[0].merchant_id).toBe('merchant-2')
    })

    it('should return assigned stores for store_admin', () => {
      const result = filterStores(stores, ROLES.STORE_ADMIN, null, ['store-1', 'store-3'])
      expect(result).toHaveLength(2)
      expect(result.map(s => s.id)).toEqual(expect.arrayContaining(['store-1', 'store-3']))
    })

    it('should return assigned stores for store_manager', () => {
      const result = filterStores(stores, ROLES.STORE_MANAGER, null, ['store-2'])
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('store-2')
    })

    it('should return empty for store_admin with no assigned stores', () => {
      const result = filterStores(stores, ROLES.STORE_ADMIN, null, [])
      expect(result).toHaveLength(0)
    })

    it('should return empty for terminal_admin', () => {
      const result = filterStores(stores, ROLES.TERMINAL_ADMIN, null, [])
      expect(result).toHaveLength(0)
    })

    it('should return empty array when stores list is empty', () => {
      const result = filterStores([], ROLES.PLATFORM_ADMIN, null, [])
      expect(result).toHaveLength(0)
    })

    it('should return empty array when role is null', () => {
      const result = filterStores(stores, null, null, [])
      expect(result).toHaveLength(0)
    })
  })

  describe('getAssignableRoles', () => {
    it('should return all roles for platform_admin', () => {
      const result = getAssignableRoles(ROLES.PLATFORM_ADMIN)
      expect(result.length).toBe(Object.keys(ROLES).length)
      expect(result).toContain(ROLES.PLATFORM_ADMIN)
      expect(result).toContain(ROLES.MERCHANT_ADMIN)
    })

    it('should return merchant/store/terminal roles for merchant_admin', () => {
      const result = getAssignableRoles(ROLES.MERCHANT_ADMIN)
      expect(result).toContain(ROLES.MERCHANT_MANAGER)
      expect(result).toContain(ROLES.STORE_ADMIN)
      expect(result).toContain(ROLES.STORE_MANAGER)
      expect(result).toContain(ROLES.TERMINAL_ADMIN)
      expect(result).not.toContain(ROLES.PLATFORM_ADMIN)
    })

    it('should return merchant/store/terminal roles for merchant_manager', () => {
      const result = getAssignableRoles(ROLES.MERCHANT_MANAGER)
      expect(result).toEqual(getAssignableRoles(ROLES.MERCHANT_ADMIN))
    })

    it('should return only terminal_admin for store_admin', () => {
      const result = getAssignableRoles(ROLES.STORE_ADMIN)
      expect(result).toEqual([ROLES.TERMINAL_ADMIN])
    })

    it('should return only terminal_admin for store_manager', () => {
      const result = getAssignableRoles(ROLES.STORE_MANAGER)
      expect(result).toEqual([ROLES.TERMINAL_ADMIN])
    })

    it('should return empty for terminal_admin', () => {
      const result = getAssignableRoles(ROLES.TERMINAL_ADMIN)
      expect(result).toHaveLength(0)
    })

    it('should return empty for null role', () => {
      const result = getAssignableRoles(null)
      expect(result).toHaveLength(0)
    })
  })
})
