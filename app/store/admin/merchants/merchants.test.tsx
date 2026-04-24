import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MerchantsClient from './MerchantsClient'
import { ROLES } from '@/lib/roles/permissions'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

describe('MerchantsClient', () => {
  const mockMerchants = [
    {
      id: '1',
      name: '테스트 가맹점 1',
      registration_number: '123-45-67890',
      address: '서울시 강남구',
      admin_id: 'admin1',
      manager_id: 'manager1',
      description: '테스트 설명',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: '테스트 가맹점 2',
      registration_number: '098-76-54321',
      address: '서울시 서초구',
      admin_id: 'admin2',
      manager_id: null,
      description: null,
      created_at: '2024-01-02T00:00:00Z',
    },
  ]

  const mockAdmins = [
    { id: 'admin1', email: 'admin1@test.com' },
    { id: 'admin2', email: 'admin2@test.com' },
  ]

  const mockManagers = [
    { id: 'manager1', email: 'manager1@test.com' },
    { id: 'manager2', email: 'manager2@test.com' },
  ]

  describe('Platform Admin 권한', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it('모든 가맹점을 표시한다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.PLATFORM_ADMIN}
          userMerchantId={null}
        />
      )

      expect(screen.getByText('테스트 가맹점 1')).toBeInTheDocument()
      expect(screen.getByText('테스트 가맹점 2')).toBeInTheDocument()
    })

    it('생성 버튼을 표시한다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.PLATFORM_ADMIN}
          userMerchantId={null}
        />
      )

      expect(screen.getByText('가맹점 추가')).toBeInTheDocument()
    })

    it('[수정] 버튼을 활성화한다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.PLATFORM_ADMIN}
          userMerchantId={null}
        />
      )

      const editButtons = screen.getAllByTitle('가맹점 수정')
      expect(editButtons.length).toBeGreaterThan(0)
      expect(editButtons[0]).not.toBeDisabled()
    })

    it('[삭제] 버튼을 활성화한다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.PLATFORM_ADMIN}
          userMerchantId={null}
        />
      )

      const deleteButtons = screen.getAllByTitle('가맹점 삭제')
      expect(deleteButtons.length).toBeGreaterThan(0)
      expect(deleteButtons[0]).not.toBeDisabled()
    })
  })

  describe('Merchant Admin 권한', () => {
    it('자신의 가맹점만 표시한다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.MERCHANT_ADMIN}
          userMerchantId="1"
        />
      )

      expect(screen.getByText('테스트 가맹점 1')).toBeInTheDocument()
      expect(screen.queryByText('테스트 가맹점 2')).not.toBeInTheDocument()
    })

    it('생성 버튼을 표시하지 않는다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.MERCHANT_ADMIN}
          userMerchantId="1"
        />
      )

      expect(screen.queryByText('가맹점 추가')).not.toBeInTheDocument()
    })

    it('[수정] 버튼만 활성화한다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.MERCHANT_ADMIN}
          userMerchantId="1"
        />
      )

      const editButtons = screen.getAllByTitle('가맹점 수정')
      expect(editButtons.length).toBeGreaterThan(0)
      expect(editButtons[0]).not.toBeDisabled()
    })

    it('[삭제] 버튼을 표시하지 않는다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.MERCHANT_ADMIN}
          userMerchantId="1"
        />
      )

      // Merchant admin은 delete 버튼이 없어야 함 (canDelete = false)
      const deleteButtons = screen.queryAllByTitle('가맹점 삭제')
      expect(deleteButtons.length).toBe(0)
    })
  })

  describe('Other roles', () => {
    it('접근 불가 메시지를 표시한다', () => {
      render(
        <MerchantsClient
          merchants={mockMerchants}
          admins={mockAdmins}
          managers={mockManagers}
          userRole={ROLES.STORE_ADMIN}
          userMerchantId={null}
        />
      )

      expect(screen.getByText('가맹점 관리 권한이 없습니다.')).toBeInTheDocument()
    })
  })
})
