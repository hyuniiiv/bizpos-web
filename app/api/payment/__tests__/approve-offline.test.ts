import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/terminal/auth', () => ({ requireTerminalAuth: vi.fn() }))
vi.mock('@/lib/payment/getBizplayClient', () => ({ getBizplayClientForTerminal: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
    }),
  }),
}))
vi.mock('@/app/api/transactions/route', () => ({ addTransaction: vi.fn() }))

function makeApproveRequest(totalAmount: number) {
  return new NextRequest('http://localhost/api/payment/approve', {
    method: 'POST',
    body: JSON.stringify({
      merchantOrderDt: '20250101', merchantOrderID: 'ORD001', merchantOrderID2: '',
      productName: '중식', quantity: 1, totalAmount, taxFreeAmount: totalAmount,
      menuId: 'M1', menuName: '중식', barcodeInfo: 'BAR001', productItems: [],
    }),
  })
}

describe('[H-5] POST /api/payment/approve — usedAmount 불일치 감지', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('usedAmount ≠ totalAmount → console.warn 호출', async () => {
    const { requireTerminalAuth } = await import('@/lib/terminal/auth')
    const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.mocked(requireTerminalAuth).mockResolvedValue({
      payload: { termId: '01', terminalId: 'tid', merchantId: 'mid' },
    } as never)
    vi.mocked(getBizplayClientForTerminal).mockResolvedValue({
      approve: vi.fn().mockResolvedValue({
        code: '0000',
        data: { tid: 'T1', usedAmount: 5000, approvedAt: '20250101120000', userName: '' },
      }),
    } as never)

    const { POST } = await import('../approve/route')
    const res = await POST(makeApproveRequest(8000))
    expect((await res.json()).code).toBe('0000')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('amount mismatch'), 8000, 5000
    )
    warnSpy.mockRestore()
  })

  it('usedAmount === totalAmount → 경고 없음', async () => {
    const { requireTerminalAuth } = await import('@/lib/terminal/auth')
    const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.mocked(requireTerminalAuth).mockResolvedValue({
      payload: { termId: '01', terminalId: 'tid', merchantId: 'mid' },
    } as never)
    vi.mocked(getBizplayClientForTerminal).mockResolvedValue({
      approve: vi.fn().mockResolvedValue({
        code: '0000',
        data: { tid: 'T1', usedAmount: 8000, approvedAt: '20250101120000', userName: '' },
      }),
    } as never)

    const { POST } = await import('../approve/route')
    await POST(makeApproveRequest(8000))
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
