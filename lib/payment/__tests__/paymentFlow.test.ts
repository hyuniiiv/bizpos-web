import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveApproveFailure } from '../paymentFlow'

const mockMarkSynced = vi.fn()
const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

describe('[C-2] resolveApproveFailure — approve 실패 후 이중 결제 방지', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMarkSynced.mockResolvedValue({ success: true })
  })

  it('approve 실패 + PG도 실패 → pending 큐 제거, isActuallySucceeded=false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 'E001', msg: '조회 실패' }),
    })

    const result = await resolveApproveFailure({
      serverUrl: 'http://localhost',
      deviceToken: 'TOKEN',
      merchantOrderID: 'ORD001',
      tid: 'TID001',
      markPaymentSynced: mockMarkSynced,
    })

    expect(mockMarkSynced).toHaveBeenCalledWith('ORD001')
    expect(result.isActuallySucceeded).toBe(false)
  })

  it('approve 실패했지만 PG에선 이미 승인 → isActuallySucceeded=true, pending 큐 제거', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: '0000', data: { tid: 'TID001' } }),
    })

    const result = await resolveApproveFailure({
      serverUrl: 'http://localhost',
      deviceToken: 'TOKEN',
      merchantOrderID: 'ORD001',
      tid: 'TID001',
      markPaymentSynced: mockMarkSynced,
    })

    expect(result.isActuallySucceeded).toBe(true)
    expect(mockMarkSynced).toHaveBeenCalledWith('ORD001')
  })

  it('result API 네트워크 오류 → pending 큐 제거, isActuallySucceeded=false', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await resolveApproveFailure({
      serverUrl: 'http://localhost',
      deviceToken: 'TOKEN',
      merchantOrderID: 'ORD001',
      tid: 'TID001',
      markPaymentSynced: mockMarkSynced,
    })

    expect(mockMarkSynced).toHaveBeenCalledWith('ORD001')
    expect(result.isActuallySucceeded).toBe(false)
  })
})
