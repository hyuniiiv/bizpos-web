import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getBizplayClientForTerminal } from '../getBizplayClient'
import { BizplayClient } from '../bizplay'

// Supabase admin mock — hoisted
const mockCreateAdminClient = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

function buildSupabaseMock(terminalData: unknown, keyData: unknown) {
  let callCount = 0
  mockCreateAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => {
            const data = callCount++ === 0 ? terminalData : keyData
            return Promise.resolve({ data })
          },
          eq: () => ({
            single: () => Promise.resolve({ data: keyData }),
          }),
        }),
      }),
    }),
  })
}

describe('getBizplayClientForTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('[C-1] merchant_key_id 없는 단말기 → throw (Mock 폴백 금지)', async () => {
    buildSupabaseMock({ merchant_key_id: null }, null)
    await expect(getBizplayClientForTerminal('01')).rejects.toThrow()
  })

  it('[C-1] 단말기 미존재 → throw', async () => {
    buildSupabaseMock(null, null)
    await expect(getBizplayClientForTerminal('99')).rejects.toThrow()
  })

  it('[C-1] 키 비활성/미존재 → throw', async () => {
    buildSupabaseMock({ merchant_key_id: 'key-abc' }, null)
    await expect(getBizplayClientForTerminal('01')).rejects.toThrow()
  })

  it('[C-1] 유효한 키 존재 → BizplayClient 반환', async () => {
    buildSupabaseMock(
      { merchant_key_id: 'key-abc' },
      { mid: 'BP001', enc_key: 'enckey123', online_ak: 'ak123', env: 'production' }
    )
    const client = await getBizplayClientForTerminal('01')
    expect(client).toBeInstanceOf(BizplayClient)
  })
})
