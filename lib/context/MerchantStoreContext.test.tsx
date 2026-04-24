import { renderHook, act } from '@testing-library/react'
import { MerchantStoreProvider, useMerchantStore } from './MerchantStoreContext'
import type { Merchant, Store } from './MerchantStoreContext'

describe('MerchantStoreContext', () => {
  const mockMerchants: Merchant[] = [
    {
      id: 'merchant-1',
      name: 'Test Merchant',
      registration_number: '123-45-67890',
      address: 'Seoul',
      admin_id: 'user-1',
      manager_id: null,
      description: null,
      created_at: '2026-04-25T00:00:00Z',
    },
  ]

  const mockStores: Store[] = [
    {
      id: 'store-1',
      merchant_id: 'merchant-1',
      store_name: 'Gangnam',
      address: 'Seoul',
      is_active: true,
      admin_id: 'user-2',
      manager_id: null,
      description: null,
      created_at: '2026-04-25T00:00:00Z',
    },
  ]

  it('should provide merchant store context', () => {
    const { result } = renderHook(() => useMerchantStore(), {
      wrapper: ({ children }) => (
        <MerchantStoreProvider
          children={children}
          initialMerchants={mockMerchants}
          initialStores={mockStores}
          initialSelectedMerchantId="merchant-1"
          initialSelectedStoreId="store-1"
          initialAssignedStoreIds={['store-1']}
          initialAssignedTerminalIds={[]}
          userRole="merchant_admin"
          userMerchantId="merchant-1"
        />
      ),
    })

    expect(result.current.selectedMerchantId).toBe('merchant-1')
    expect(result.current.merchants).toHaveLength(1)
  })
})
