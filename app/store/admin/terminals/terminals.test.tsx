import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TerminalForm from './TerminalForm'
import MenuManager from './MenuManager'
import TerminalsClient from './TerminalsClient'
import { ROLES } from '@/lib/roles/permissions'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  }),
}))

describe('TerminalForm', () => {
  const mockTerminal = {
    id: 'term-123',
    term_id: '01',
    name: 'Main POS',
    corner: 'Kitchen',
    terminal_type: 'pos' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render terminal form with all fields', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.PLATFORM_ADMIN}
        readOnly={false}
      />
    )

    expect(screen.getByDisplayValue('01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Main POS')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Kitchen')).toBeInTheDocument()
  })

  it('should disable form when readOnly is true', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.PLATFORM_ADMIN}
        readOnly={true}
      />
    )

    const termIdInput = screen.getByDisplayValue('01')
    expect(termIdInput).toBeDisabled()
  })

  it('should disable save button when user lacks permission', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.MERCHANT_ADMIN}
        readOnly={false}
      />
    )

    const saveButton = screen.getByText('저장')
    expect(saveButton).toBeDisabled()
  })

  it('should enable save button for platform_admin', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.PLATFORM_ADMIN}
        readOnly={false}
      />
    )

    const saveButton = screen.getByText('저장')
    expect(saveButton).not.toBeDisabled()
  })

  it('should show warning message when no permission', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.STORE_ADMIN}
        readOnly={false}
      />
    )

    expect(screen.getByText(/이 단말기를 수정할 권한이 없습니다/)).toBeInTheDocument()
  })

  it('should render terminal type select', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.PLATFORM_ADMIN}
        readOnly={false}
      />
    )

    expect(screen.getByDisplayValue('POS')).toBeInTheDocument()
  })
})

describe('MenuManager', () => {
  const mockTerminal = {
    id: 'term-123',
    term_id: '01',
    name: 'Main POS',
    terminal_type: 'pos',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render menu tabs', () => {
    render(
      <MenuManager
        terminal={mockTerminal}
        initialMenuConfig={{
          pos: [],
          kiosk: [],
          ticket_checker: [],
          table_order: [],
        }}
      />
    )

    expect(screen.getByText('POS')).toBeInTheDocument()
    expect(screen.getByText('KIOSK')).toBeInTheDocument()
    expect(screen.getByText('식권체크')).toBeInTheDocument()
    expect(screen.getByText('테이블 오더')).toBeInTheDocument()
  })

  it('should display products for pos menu', () => {
    render(
      <MenuManager
        terminal={mockTerminal}
        initialMenuConfig={{
          pos: [],
          kiosk: [],
          ticket_checker: [],
          table_order: [],
        }}
      />
    )

    // Default tab is POS, should show POS products
    expect(screen.getByText('음료')).toBeInTheDocument()
    expect(screen.getByText('식사')).toBeInTheDocument()
  })

  it('should render save button', () => {
    render(
      <MenuManager
        terminal={mockTerminal}
        initialMenuConfig={{
          pos: [],
          kiosk: [],
          ticket_checker: [],
          table_order: [],
        }}
      />
    )

    expect(screen.getByText('메뉴 설정 저장')).toBeInTheDocument()
  })

  it('should have all checkboxes for products', () => {
    render(
      <MenuManager
        terminal={mockTerminal}
        initialMenuConfig={{
          pos: [],
          kiosk: [],
          ticket_checker: [],
          table_order: [],
        }}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })
})

describe('TerminalsClient', () => {
  const mockStores = [
    { id: 'store-1', store_name: '강남점' },
    { id: 'store-2', store_name: '홍대점' },
  ]

  const mockTerminals = [
    {
      id: 'term-1',
      name: 'POS-1',
      term_id: '01',
      corner: 'Kitchen',
      status: 'online',
      terminal_type: 'pos' as const,
      last_seen_at: new Date().toISOString(),
      activation_code: null,
      access_token: 'token-123',
      went_offline_at: null,
      store_id: 'store-1',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render store filter section', () => {
    render(
      <TerminalsClient
        initialTerminals={mockTerminals}
        merchantId="merchant-1"
        stores={mockStores}
        userRole={ROLES.PLATFORM_ADMIN}
        assignedStoreIds={[]}
      />
    )

    // Verify filter title is present
    expect(screen.getByText('매장 필터')).toBeInTheDocument()
    // Verify checkboxes exist for stores
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('should show empty message when no stores selected', () => {
    render(
      <TerminalsClient
        initialTerminals={mockTerminals}
        merchantId="merchant-1"
        stores={mockStores}
        userRole={ROLES.PLATFORM_ADMIN}
        assignedStoreIds={[]}
      />
    )

    expect(screen.getByText(/매장을 선택하여 단말기를 확인/)).toBeInTheDocument()
  })

  it('should have store filter checkboxes', () => {
    render(
      <TerminalsClient
        initialTerminals={mockTerminals}
        merchantId="merchant-1"
        stores={mockStores}
        userRole={ROLES.PLATFORM_ADMIN}
        assignedStoreIds={[]}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0) // Should have checkboxes for stores
  })
})

describe('Permission-based access control', () => {
  const mockTerminal = {
    id: 'term-123',
    term_id: '01',
    name: 'Main POS',
    corner: 'Kitchen',
    terminal_type: 'pos' as const,
  }

  it('platform_admin can edit terminals - save button enabled', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.PLATFORM_ADMIN}
        readOnly={false}
      />
    )

    expect(screen.getByText('저장')).not.toBeDisabled()
  })

  it('terminal_admin can edit terminals - save button enabled', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.TERMINAL_ADMIN}
        readOnly={false}
      />
    )

    expect(screen.getByText('저장')).not.toBeDisabled()
  })

  it('merchant_admin cannot edit terminals - save button disabled', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.MERCHANT_ADMIN}
        readOnly={false}
      />
    )

    expect(screen.getByText('저장')).toBeDisabled()
  })

  it('store_admin cannot edit terminals - save button disabled', () => {
    render(
      <TerminalForm
        terminal={mockTerminal}
        userRole={ROLES.STORE_ADMIN}
        readOnly={false}
      />
    )

    expect(screen.getByText('저장')).toBeDisabled()
  })

  it('all roles can access menu manager', () => {
    render(
      <MenuManager
        terminal={{
          id: 'term-123',
          term_id: '01',
          name: 'Main POS',
          terminal_type: 'pos',
        }}
        initialMenuConfig={{
          pos: [],
          kiosk: [],
          ticket_checker: [],
          table_order: [],
        }}
      />
    )

    expect(screen.getByText('메뉴 설정')).toBeInTheDocument()
  })
})
