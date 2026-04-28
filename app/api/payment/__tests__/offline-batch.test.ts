import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSyncOffline = vi.fn()

vi.mock('@/lib/terminal/auth', () => ({ requireTerminalAuth: vi.fn() }))
vi.mock('@/lib/payment/getBizplayClient', () => ({ getBizplayClientForTerminal: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  }),
}))
vi.mock('@/app/api/transactions/route', () => ({ addTransaction: vi.fn() }))
vi.mock('@/app/api/payment/approve/route', () => ({ emitTransaction: vi.fn() }))

function makeRecord(id: string, termId = 'JWT_TERM') {
  return {
    termId, merchantOrderID: id, totalAmount: 8000,
    productName: '중식', merchantOrderDt: '20250101',
    barcodeInfo: `BAR${id}`, barcodeType: '1',
  }
}

describe('[H-4] POST /api/payment/offline — 건별 성공/실패 분리', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('일부 건만 성공할 때 성공한 건만 syncedIds에 포함된다', async () => {
    const { requireTerminalAuth } = await import('@/lib/terminal/auth')
    const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')

    vi.mocked(requireTerminalAuth).mockResolvedValue({
      payload: { termId: 'JWT_TERM', terminalId: 'tid', merchantId: 'mid' },
    } as never)

    // ORD001 성공, ORD002 실패, ORD003 성공
    mockSyncOffline
      .mockResolvedValueOnce({ code: '0000' })
      .mockResolvedValueOnce({ code: 'E001' })
      .mockResolvedValueOnce({ code: '0000' })

    vi.mocked(getBizplayClientForTerminal).mockResolvedValue({
      syncOffline: mockSyncOffline,
    } as never)

    const { POST } = await import('../offline/route')
    const res = await POST(new NextRequest('http://localhost/api/payment/offline', {
      method: 'POST',
      body: JSON.stringify({
        records: [makeRecord('ORD001'), makeRecord('ORD002'), makeRecord('ORD003')],
      }),
    }))

    const data = await res.json()
    expect(data.syncedIds).toContain('ORD001')
    expect(data.syncedIds).not.toContain('ORD002')
    expect(data.syncedIds).toContain('ORD003')
    expect(data.synced).toBe(2)
    expect(mockSyncOffline).toHaveBeenCalledTimes(3)  // 건별 3회 호출
  })

  it('전체 실패 시 syncedIds가 빈 배열이다', async () => {
    const { requireTerminalAuth } = await import('@/lib/terminal/auth')
    const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')

    vi.mocked(requireTerminalAuth).mockResolvedValue({
      payload: { termId: 'JWT_TERM', terminalId: 'tid', merchantId: 'mid' },
    } as never)
    mockSyncOffline.mockResolvedValue({ code: 'E999' })
    vi.mocked(getBizplayClientForTerminal).mockResolvedValue({
      syncOffline: mockSyncOffline,
    } as never)

    const { POST } = await import('../offline/route')
    const res = await POST(new NextRequest('http://localhost/api/payment/offline', {
      method: 'POST',
      body: JSON.stringify({
        records: [makeRecord('ORD001'), makeRecord('ORD002')],
      }),
    }))

    const data = await res.json()
    expect(data.syncedIds).toHaveLength(0)
    expect(data.synced).toBe(0)
  })
})
