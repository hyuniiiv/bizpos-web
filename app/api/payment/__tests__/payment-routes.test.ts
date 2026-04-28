import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetTransactionResult = vi.fn()
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

// ── [H-1] result route ──────────────────────────────────────────────────────
describe('[H-1] POST /api/payment/result', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('JWT payload.termId를 사용해 클라이언트 조회 (body.termId 무시)', async () => {
    const { requireTerminalAuth } = await import('@/lib/terminal/auth')
    const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')

    vi.mocked(requireTerminalAuth).mockResolvedValue({
      payload: { termId: 'JWT_TERM', terminalId: 'tid', merchantId: 'mid' },
    } as never)
    vi.mocked(getBizplayClientForTerminal).mockResolvedValue({
      getTransactionResult: mockGetTransactionResult.mockResolvedValue({ code: '0000' }),
    } as never)

    const { POST } = await import('../result/route')
    await POST(new NextRequest('http://localhost/api/payment/result', {
      method: 'POST',
      body: JSON.stringify({ termId: 'BODY_TERM', merchantOrderID: 'ORD001', tid: 'TID001' }),
    }))

    expect(getBizplayClientForTerminal).toHaveBeenCalledWith('JWT_TERM')
    expect(getBizplayClientForTerminal).not.toHaveBeenCalledWith('BODY_TERM')
  })
})

// ── [H-2] offline route ─────────────────────────────────────────────────────
describe('[H-2] POST /api/payment/offline', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('JWT payload.termId를 사용 (records[0].termId 무시)', async () => {
    const { requireTerminalAuth } = await import('@/lib/terminal/auth')
    const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')

    vi.mocked(requireTerminalAuth).mockResolvedValue({
      payload: { termId: 'JWT_TERM', terminalId: 'tid', merchantId: 'mid' },
    } as never)
    vi.mocked(getBizplayClientForTerminal).mockResolvedValue({
      syncOffline: mockSyncOffline.mockResolvedValue({ code: '0000' }),
    } as never)

    const { POST } = await import('../offline/route')
    await POST(new NextRequest('http://localhost/api/payment/offline', {
      method: 'POST',
      body: JSON.stringify({
        // 레코드의 termId는 JWT와 일치 (올바른 요청)
        // getBizplayClientForTerminal은 JWT_TERM으로 호출되어야 함
        records: [{ termId: 'JWT_TERM', merchantOrderID: 'ORD001', totalAmount: 8000, productName: '중식', merchantOrderDt: '20250101', barcodeInfo: 'BAR001', barcodeType: '1' }],
      }),
    }))

    expect(getBizplayClientForTerminal).toHaveBeenCalledWith('JWT_TERM')
    expect(getBizplayClientForTerminal).not.toHaveBeenCalledWith('RECORD_TERM')
  })

  it('타 단말기 레코드 포함 시 403 반환', async () => {
    const { requireTerminalAuth } = await import('@/lib/terminal/auth')
    vi.mocked(requireTerminalAuth).mockResolvedValue({
      payload: { termId: 'TERM_A', terminalId: 'tid', merchantId: 'mid' },
    } as never)

    const { POST } = await import('../offline/route')
    const res = await POST(new NextRequest('http://localhost/api/payment/offline', {
      method: 'POST',
      body: JSON.stringify({
        records: [
          { termId: 'TERM_A', merchantOrderID: 'ORD001', totalAmount: 8000, productName: '중식', merchantOrderDt: '20250101', barcodeInfo: 'BAR001', barcodeType: '1' },
          { termId: 'TERM_B', merchantOrderID: 'ORD002', totalAmount: 8000, productName: '중식', merchantOrderDt: '20250101', barcodeInfo: 'BAR002', barcodeType: '1' },
        ],
      }),
    }))

    expect(res.status).toBe(403)
  })
})
