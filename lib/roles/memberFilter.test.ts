import { expect, describe, it } from 'vitest'
import { filterMembersByRole } from './memberFilter'

interface TestMember {
  id: string
  role: string
}

describe('memberFilter - role-based member filtering', () => {
  const allMembers: TestMember[] = [
    { id: '1', role: 'platform_admin' },
    { id: '2', role: 'merchant_admin' },
    { id: '3', role: 'store_manager' },
    { id: '4', role: 'client_manager' },
  ]

  it('platform_admin can see all members', () => {
    const filtered = filterMembersByRole(allMembers, 'platform_admin')
    expect(filtered).toHaveLength(4)
  })

  it('platform_manager can see all members', () => {
    const filtered = filterMembersByRole(allMembers, 'platform_manager')
    expect(filtered).toHaveLength(4)
  })

  it('merchant_admin can see merchant and store members', () => {
    const filtered = filterMembersByRole(allMembers, 'merchant_admin')
    expect(filtered).toHaveLength(2)
    expect(filtered.every(m => ['merchant_admin', 'store_manager'].includes(m.role))).toBe(true)
  })

  it('merchant_manager can see merchant and store members', () => {
    const filtered = filterMembersByRole(allMembers, 'merchant_manager')
    expect(filtered).toHaveLength(2)
    expect(filtered.every(m => ['merchant_admin', 'store_manager'].includes(m.role))).toBe(true)
  })

  it('store_admin can see only store members', () => {
    const filtered = filterMembersByRole(allMembers, 'store_admin')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].role).toBe('store_manager')
  })

  it('store_manager can see only store members', () => {
    const filtered = filterMembersByRole(allMembers, 'store_manager')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].role).toBe('store_manager')
  })

  it('terminal_admin cannot see any members', () => {
    const filtered = filterMembersByRole(allMembers, 'terminal_admin')
    expect(filtered).toHaveLength(0)
  })

  it('client_admin cannot see any members', () => {
    const filtered = filterMembersByRole(allMembers, 'client_admin')
    expect(filtered).toHaveLength(0)
  })
})
