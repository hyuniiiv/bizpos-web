import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MembersClient from './MembersClient'

interface Member {
  id: string
  user_id: string
  role: string
  email: string
  created_at: string
}

const mockMembers: Member[] = [
  {
    id: 'mem-1',
    user_id: 'user-1',
    role: 'merchant_admin',
    email: 'admin@example.com',
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'mem-2',
    user_id: 'user-2',
    role: 'store_manager',
    email: 'manager@example.com',
    created_at: '2026-04-02T00:00:00Z',
  },
]

describe('MembersClient', () => {
  it('should render list of members', () => {
    render(
      <MembersClient
        members={mockMembers}
        myRole="merchant_admin"
        merchantId="merchant-1"
        currentUserId="user-1"
      />
    )

    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('manager@example.com')).toBeInTheDocument()
  })

  it('should display member roles', () => {
    render(
      <MembersClient
        members={mockMembers}
        myRole="merchant_admin"
        merchantId="merchant-1"
        currentUserId="user-1"
      />
    )

    expect(screen.getByText(/merchant_admin|store_manager/)).toBeInTheDocument()
  })

  it('should render empty state when no members', () => {
    render(
      <MembersClient
        members={[]}
        myRole="merchant_admin"
        merchantId="merchant-1"
        currentUserId="user-1"
      />
    )

    expect(screen.getByText(/멤버|없|가입/i)).toBeInTheDocument()
  })

  it('should filter members by role - store_manager cannot see merchant_admin', () => {
    render(
      <MembersClient
        members={mockMembers}
        myRole="store_manager"
        merchantId="merchant-1"
        currentUserId="user-2"
      />
    )

    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument()
    expect(screen.getByText('manager@example.com')).toBeInTheDocument()
  })

  it('should show all members to platform_admin', () => {
    render(
      <MembersClient
        members={mockMembers}
        myRole="platform_admin"
        merchantId="merchant-1"
        currentUserId="user-1"
      />
    )

    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('manager@example.com')).toBeInTheDocument()
  })

  it('should not show any members to terminal_admin', () => {
    render(
      <MembersClient
        members={mockMembers}
        myRole="terminal_admin"
        merchantId="merchant-1"
        currentUserId="user-1"
      />
    )

    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument()
    expect(screen.queryByText('manager@example.com')).not.toBeInTheDocument()
  })
})
