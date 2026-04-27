import { NextRequest, NextResponse } from 'next/server'
import { BizplayClient, MockBizplayClient } from '@/lib/payment/bizplay'
import { generateOrderId } from '@/lib/payment/order'
import type { ReserveRequest } from '@/types/payment'
import { requireTerminalAuth } from '@/lib/terminal/auth'

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  const t0 = Date.now()
  try {
    const body = await req.json() as ReserveRequest & {
      env?: 'production' | 'development'
      onlineAK?: string
      merchantId?: string
    }

    // JWT에서 검증된 termId 사용 (바디 값 신뢰 금지)
    const termId = auth.payload.termId
    let client
    if (termId) {
      const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')
      client = await getBizplayClientForTerminal(termId)
    } else if (process.env.BIZPLAY_MID) {
      client = new BizplayClient({
        mid: process.env.BIZPLAY_MID,
        encKey: process.env.BIZPLAY_ENC_KEY!,
        onlineAK: process.env.BIZPLAY_ONLINE_AK!,
        env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      })
    } else {
      client = new MockBizplayClient()
    }

    const tBizplay = Date.now()
    const result = await client.reserve(body)
    const totalMs = Date.now() - t0
    const bizplayMs = Date.now() - tBizplay
    console.log(`[reserve-timing] total=${totalMs}ms bizplay=${bizplayMs}ms termId=${termId ?? 'none'} code=${result.code ?? '?'}`)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[reserve] Error:', err)
    return NextResponse.json({ code: 'C002', msg: '서버 오류' }, { status: 500 })
  }
}
