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
    address: '서울시 강남구',
    is_active: true,
    merchant_keys: [],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'store-2',
    merchant_id: 'merchant-1',
    store_name: '서초점',
    address: '서울시 서초구',
    is_active: true,
    merchant_keys: [],
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'store-3',
    merchant_id: 'merchant-2',
    store_name: '강북점',
    address: null,
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

  it('should show terminal count in collapsed store card', () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient stores={mockStores} terminals={mockTerminals} myRole="platform_admin" merchantId="merchant-1" />
      </StoreProvider>
    )

    // 단말기 수는 접힌 상태에서도 부제목에 표시됨
    const terminalCountText = screen.getAllByText(/단말기/)
    expect(terminalCountText.length).toBeGreaterThan(0)
  })

  it('should indicate terminal status after expanding', async () => {
    const user = userEvent.setup()
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient stores={mockStores} terminals={mockTerminals} myRole="platform_admin" merchantId="merchant-1" />
      </StoreProvider>
    )

    // 강남점 카드의 주소 텍스트를 클릭하면 카드 펼쳐짐
    const subtitles = screen.getAllByText(/서울시 강남구/)
    await user.click(subtitles[0])
    const statusElements = screen.getAllByRole('status')
    expect(statusElements.length).toBeGreaterThan(0)
  })
})
