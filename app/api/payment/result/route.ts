import { NextRequest, NextResponse } from 'next/server'
import { getBizplayClientForTerminal } from '@/lib/payment/getBizplayClient'
import { requireTerminalAuth } from '@/lib/terminal/auth'

/**
 * POST /api/payment/result — 거래결과조회
 */
export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  try {
    const body = await req.json() as {
      merchantOrderID: string
      tid: string
    }

    // JWT에서 검증된 termId 사용 (바디 값 신뢰 금지)
    const client = await getBizplayClientForTerminal(auth.payload.termId)
    const result = await client.getTransactionResult({
      merchantOrderID: body.merchantOrderID,
      tid: body.tid,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[payment/result] Error:', err)
    return NextResponse.json({ code: 'C002', msg: '서버 오류' }, { status: 500 })
  }
}
