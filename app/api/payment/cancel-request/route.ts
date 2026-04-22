import { NextRequest, NextResponse } from 'next/server'
import { getBizplayClientForTerminal } from '@/lib/payment/getBizplayClient'
import type { CancelRequest } from '@/types/payment'
import { requireTerminalAuth } from '@/lib/terminal/auth'

/**
 * POST /api/payment/cancel-request — 결제취소요청 (비동기 취소)
 */
export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  try {
    const body = await req.json() as CancelRequest & { termId: string }

    const client = await getBizplayClientForTerminal(body.termId)
    const result = await client.cancelRequest(body)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[payment/cancel-request] Error:', err)
    return NextResponse.json({ code: 'C002', msg: '서버 오류' }, { status: 500 })
  }
}
