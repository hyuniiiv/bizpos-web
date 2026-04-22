import { NextRequest, NextResponse } from 'next/server'
import { BizplayClient, MockBizplayClient } from '@/lib/payment/bizplay'
import { generateOrderId } from '@/lib/payment/order'
import type { ReserveRequest } from '@/types/payment'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ReserveRequest & {
      termId: string
      env?: 'production' | 'development'
      onlineAK?: string
      merchantId?: string
    }

    // DB 기반 키 사용 — termId가 있으면 getBizplayClientForTerminal 사용
    let client
    if (body.termId) {
      const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')
      client = await getBizplayClientForTerminal(body.termId)
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

    const result = await client.reserve(body)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[reserve] Error:', err)
    return NextResponse.json({ code: 'C002', msg: '서버 오류' }, { status: 500 })
  }
}
