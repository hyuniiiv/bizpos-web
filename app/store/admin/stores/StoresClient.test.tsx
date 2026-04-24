import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StoresClient from './StoresClient'
import { StoreProvider } from '@/lib/context/StoreContext'

// Mock data
const mockStores = [
  {
    id: 'store-1',
    merchant_id: 'merchant-1',
    store_name: '강남점',
    biz_no: '123-45-67890',
    is_active: true,
    merchant_keys: [],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'store-2',
    merchant_id: 'merchant-1',
    store_name: '서초점',
    biz_no: '098-76-54321',
    is_active: true,
    merchant_keys: [],
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'store-3',
    merchant_id: 'merchant-2',
    store_name: '강북점',
    biz_no: null,
    is_active: true,
    merchant_keys: [],
    created_at: '2024-01-03T00:00:00Z',
  },
]

const mockTerminals = [
  {
    id: 'term-1',
    store_id: 'store-1',
    term_id: '01',
    name: 'POS-1',
    status: 'online' as const,
  },
  {
    id: 'term-2',
    store_id: 'store-1',
    term_id: '02',
    name: 'POS-2',
    status: 'online' as const,
  },
  {
    id: 'term-3',
    store_id: 'store-2',
    term_id: '01',
    name: 'POS-1',
    status: 'offline' as const,
  },
]

const mockStoreStats = {
  'store-1': { todayTransaction: 1500000, weeklyTransaction: 8500000, activeUsers: 42, productSales: 127, terminals: 2, members: 5 },
  'store-2': { todayTransaction: 800000, weeklyTransaction: 4200000, activeUsers: 28, productSales: 65, terminals: 1, members: 3 },
}

describe('StoresClient Dashboard', () => {
  it('should render dashboard heading', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient
          stores={mockStores}
          myRole="platform_admin"
          merchantId="merchant-1"
          terminals={mockTerminals}
        />
      </StoreProvider>
    )

    expect(screen.getByText('매장 관리')).toBeInTheDocument()
  })

  it('should render dashboard cards with statistics', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient
          stores={mockStores}
          myRole="platform_admin"
          merchantId="merchant-1"
          terminals={mockTerminals}
          storeStats={mockStoreStats}
        />
      </StoreProvider>
    )

    // 대시보드 카드 라벨 확인
    const transactionCards = screen.queryAllByText(/거래액/)
    expect(transactionCards.length).toBeGreaterThan(0)
  })

  it('should display store list table with store names', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient
          stores={mockStores}
          myRole="platform_admin"
          merchantId="merchant-1"
          terminals={mockTerminals}
        />
      </StoreProvider>
    )

    expect(screen.getByText('강남점')).toBeInTheDocument()
    expect(screen.getByText('서초점')).toBeInTheDocument()
  })

  it('should filter stores by merchant for merchant_admin', () => {
    const filteredStores = mockStores.filter(s => s.merchant_id === 'merchant-1')
    render(
      <StoreProvider initialStoreId="store-1" initialStores={filteredStores}>
        <StoresClient
          stores={filteredStores}
          myRole="merchant_admin"
          merchantId="merchant-1"
          terminals={mockTerminals}
        />
      </StoreProvider>
    )

    expect(screen.getByText('강남점')).toBeInTheDocument()
    expect(screen.getByText('서초점')).toBeInTheDocument()
    expect(screen.queryByText('강북점')).not.toBeInTheDocument()
  })

  it('should show edit button for platform_admin', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient
          stores={mockStores}
          myRole="platform_admin"
          merchantId="merchant-1"
          terminals={mockTerminals}
        />
      </StoreProvider>
    )

    const editButtons = screen.queryAllByTitle('매장 수정')
    expect(editButtons.length).toBeGreaterThan(0)
  })

  it('should show delete button for platform_admin only', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient
          stores={mockStores}
          myRole="platform_admin"
          merchantId="merchant-1"
          terminals={mockTerminals}
        />
      </StoreProvider>
    )

    const deleteButtons = screen.queryAllByTitle('매장 삭제')
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('should not show delete button for store_admin', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient
          stores={mockStores}
          myRole="store_admin"
          merchantId="merchant-1"
          terminals={mockTerminals}
        />
      </StoreProvider>
    )

    const deleteButtons = screen.queryAllByTitle('매장 삭제')
    expect(deleteButtons.length).toBe(0)
  })

  it('should display terminals grouped by store', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient stores={mockStores} terminals={mockTerminals} myRole="platform_admin" merchantId="merchant-1" />
      </StoreProvider>
    )

    const terminalElements = screen.getAllByText(/POS-/)
    expect(terminalElements.length).toBe(3)
  })

  it('should indicate terminal status', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient stores={mockStores} terminals={mockTerminals} myRole="platform_admin" merchantId="merchant-1" />
      </StoreProvider>
    )

    const statusElements = screen.getAllByRole('status')
    expect(statusElements.length).toBeGreaterThan(0)
  })
})
