import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TerminalListClient from '@/components/dashboard/TerminalListClient'

interface Terminal {
  id: string
  name: string
  term_id: string
  corner?: string
  status: 'online' | 'offline'
  terminal_type?: string
  last_seen_at?: string
  activation_code?: string
  access_token?: string
  went_offline_at?: string
}

const mockTerminals: Terminal[] = [
  {
    id: 'term-1',
    name: 'POS-1',
    term_id: '01',
    status: 'online',
  },
  {
    id: 'term-2',
    name: 'POS-2',
    term_id: '02',
    status: 'online',
  },
  {
    id: 'term-3',
    name: 'POS-1',
    term_id: '01',
    status: 'offline',
  },
]

describe('TerminalListClient', () => {
  it('should render list of terminals', () => {
    render(
      <TerminalListClient
        initialTerminals={mockTerminals}
        merchantId="merchant-1"
      />
    )

    expect(screen.getByText('POS-1')).toBeInTheDocument()
    expect(screen.getByText('POS-2')).toBeInTheDocument()
  })

  it('should display terminal status indicators', () => {
    render(
      <TerminalListClient
        initialTerminals={mockTerminals}
        merchantId="merchant-1"
      />
    )

    const statusElements = screen.getAllByRole('status')
    expect(statusElements.length).toBeGreaterThan(0)
  })
})
