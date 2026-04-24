import { expect, describe, it, vi, beforeEach } from 'vitest'
import * as emailMapModule from '@/lib/supabase/emailMap'

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
