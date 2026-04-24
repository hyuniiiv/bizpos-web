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
    is_active: true,
    merchant_keys: [],
  },
  {
    id: 'store-2',
    merchant_id: 'merchant-1',
    store_name: '서초점',
    is_active: true,
    merchant_keys: [],
  },
]

const mockTerminals = [
  {
    id: 'term-1',
    store_id: 'store-1',
    merchant_id: 'merchant-1',
    term_id: '01',
    name: 'POS-1',
    status: 'online',
  },
  {
    id: 'term-2',
    store_id: 'store-1',
    merchant_id: 'merchant-1',
    term_id: '02',
    name: 'POS-2',
    status: 'online',
  },
  {
    id: 'term-3',
    store_id: 'store-2',
    merchant_id: 'merchant-1',
    term_id: '01',
    name: 'POS-1',
    status: 'offline',
  },
]


describe('StoresClient', () => {
  it('should render stores list with inline terminals', async () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient stores={mockStores} terminals={mockTerminals} />
      </StoreProvider>
    )

    // 매장 이름 확인
    expect(screen.getByText('강남점')).toBeInTheDocument()
    expect(screen.getByText('서초점')).toBeInTheDocument()
  })

  it('should display terminals grouped by store', async () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient stores={mockStores} terminals={mockTerminals} />
      </StoreProvider>
    )

    // 모든 단말기 확인 (강남점 2개, 서초점 1개)
    const terminalElements = screen.getAllByText(/POS-/)
    expect(terminalElements.length).toBe(3)
  })

  it('should indicate terminal status (online/offline)', async () => {
    render(
      <StoreProvider initialStoreId="store-1" initialStores={mockStores}>
        <StoresClient stores={mockStores} terminals={mockTerminals} />
      </StoreProvider>
    )

    // 상태 표시 확인 (가정: online은 초록색, offline은 회색)
    const onlineElements = screen.getAllByRole('status') // 커스텀 역할
    expect(onlineElements.length).toBeGreaterThan(0)
  })
})
