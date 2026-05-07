import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { OfflineRecord } from '@/types/payment'

// ── 모킹 상태 (각 테스트에서 제어) ──────────────────────────────────────────
let mockDeviceToken: string | null = 'TOKEN'
const mockSetPendingCount = vi.fn()
const mockGetPendingPayments = vi.fn()
const mockMarkPaymentSynced = vi.fn()

vi.mock('@/lib/repository/payment.repository', () => ({
  PaymentRepository: {
    getPendingPayments: (...args: unknown[]) => mockGetPendingPayments(...args),
    markPaymentSynced: (...args: unknown[]) => mockMarkPaymentSynced(...args),
  },
}))

vi.mock('@/lib/serverUrl', () => ({ getServerUrl: () => 'http://localhost:3000' }))

vi.mock('@/lib/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      deviceToken: mockDeviceToken,
      setPendingCount: mockSetPendingCount,
    }),
  },
}))

function makeRecord(id: string): OfflineRecord {
  return {
    termId: 'TERM01',
    merchantOrderID: id,
    totalAmount: 8000,
    productName: '중식',
    merchantOrderDt: '20250101',
    barcodeInfo: `BAR${id}`,
    barcodeType: '1',
  }
}

function okResponse(syncedIds: string[]) {
  return new Response(JSON.stringify({ syncedIds }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('flushOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeviceToken = 'TOKEN'
    mockGetPendingPayments.mockResolvedValue([])
    mockMarkPaymentSynced.mockResolvedValue({ success: true })
  })

  // ── [T-1] 토큰 없음 ──────────────────────────────────────────────────────
  it('[T-1] 토큰 없으면 fetch 호출 없이 즉시 반환', async () => {
    mockDeviceToken = null
    const fetchSpy = vi.spyOn(global, 'fetch')

    const { flushOfflineQueue } = await import('@/lib/txSync')
    const result = await flushOfflineQueue()

    expect(result).toEqual({ synced: 0, failed: 0 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // ── [T-2] 빈 큐 ──────────────────────────────────────────────────────────
  it('[T-2] 큐가 비어있으면 fetch 호출 없음', async () => {
    mockGetPendingPayments.mockResolvedValue([])
    const fetchSpy = vi.spyOn(global, 'fetch')

    const { flushOfflineQueue } = await import('@/lib/txSync')
    const result = await flushOfflineQueue()

    expect(result).toEqual({ synced: 0, failed: 0 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // ── [T-3] 동시 호출 방지 ─────────────────────────────────────────────────
  it('[T-3] 동시 호출 시 두 번째는 즉시 { synced:0, failed:0 } 반환', async () => {
    mockGetPendingPayments.mockResolvedValue([makeRecord('ORD001')])

    let resolveFetch!: (value: Response) => void
    vi.spyOn(global, 'fetch').mockReturnValue(
      new Promise<Response>(res => { resolveFetch = res })
    )

    const { flushOfflineQueue } = await import('@/lib/txSync')

    const firstPromise = flushOfflineQueue()       // isFlushing = true, fetch 대기 중
    const secondResult = await flushOfflineQueue() // 즉시 반환

    expect(secondResult).toEqual({ synced: 0, failed: 0 })

    resolveFetch(okResponse(['ORD001']))
    await firstPromise
  })

  // ── [T-4] syncedIds 건만 제거 ────────────────────────────────────────────
  it('[T-4] syncedIds 건만 markPaymentSynced 호출, 나머지는 큐에 유지', async () => {
    mockGetPendingPayments
      .mockResolvedValueOnce([makeRecord('ORD001'), makeRecord('ORD002')])
      .mockResolvedValueOnce([makeRecord('ORD002')]) // 동기화 후 잔여

    vi.spyOn(global, 'fetch').mockResolvedValue(okResponse(['ORD001']))

    const { flushOfflineQueue } = await import('@/lib/txSync')
    const result = await flushOfflineQueue()

    expect(mockMarkPaymentSynced).toHaveBeenCalledWith('ORD001')
    expect(mockMarkPaymentSynced).not.toHaveBeenCalledWith('ORD002')
    expect(result).toEqual({ synced: 1, failed: 1 })
    expect(mockSetPendingCount).toHaveBeenCalledWith(1)
  })

  // ── [T-5] 서버 오류 시 유실 없음 ─────────────────────────────────────────
  it('[T-5] 서버 5xx 응답 시 markPaymentSynced 미호출 — 재시도 보장', async () => {
    mockGetPendingPayments
      .mockResolvedValueOnce([makeRecord('ORD001')])
      .mockResolvedValueOnce([makeRecord('ORD001')]) // 여전히 큐에 남음

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 })
    )

    const { flushOfflineQueue } = await import('@/lib/txSync')
    const result = await flushOfflineQueue()

    expect(mockMarkPaymentSynced).not.toHaveBeenCalled()
    expect(result).toEqual({ synced: 0, failed: 1 })
    expect(mockSetPendingCount).toHaveBeenCalledWith(1)
  })

  // ── [T-6] 네트워크 예외 시 유실 없음 ────────────────────────────────────
  it('[T-6] fetch 예외 시 markPaymentSynced 미호출 — 재시도 보장', async () => {
    mockGetPendingPayments
      .mockResolvedValueOnce([makeRecord('ORD001')])
      .mockResolvedValueOnce([makeRecord('ORD001')])

    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network Error'))

    const { flushOfflineQueue } = await import('@/lib/txSync')
    const result = await flushOfflineQueue()

    expect(mockMarkPaymentSynced).not.toHaveBeenCalled()
    expect(result).toEqual({ synced: 0, failed: 1 })
  })

  // ── [T-7] 전량 성공 ──────────────────────────────────────────────────────
  it('[T-7] 전체 건 성공 시 synced === 큐 길이, setPendingCount(0) 호출', async () => {
    const records = [makeRecord('ORD001'), makeRecord('ORD002'), makeRecord('ORD003')]
    mockGetPendingPayments
      .mockResolvedValueOnce(records)
      .mockResolvedValueOnce([])

    vi.spyOn(global, 'fetch').mockResolvedValue(
      okResponse(['ORD001', 'ORD002', 'ORD003'])
    )

    const { flushOfflineQueue } = await import('@/lib/txSync')
    const result = await flushOfflineQueue()

    expect(result).toEqual({ synced: 3, failed: 0 })
    expect(mockMarkPaymentSynced).toHaveBeenCalledTimes(3)
    expect(mockSetPendingCount).toHaveBeenCalledWith(0)
  })

  // ── [T-8] syncedIds 폴백 ─────────────────────────────────────────────────
  it('[T-8] 서버 응답에 syncedIds 없으면 빈 배열 처리 — 유실 없음', async () => {
    mockGetPendingPayments
      .mockResolvedValueOnce([makeRecord('ORD001')])
      .mockResolvedValueOnce([makeRecord('ORD001')])

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: '0000' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { flushOfflineQueue } = await import('@/lib/txSync')
    const result = await flushOfflineQueue()

    expect(mockMarkPaymentSynced).not.toHaveBeenCalled()
    expect(result).toEqual({ synced: 0, failed: 1 })
  })
})
