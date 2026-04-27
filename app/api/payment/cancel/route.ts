import { NextRequest, NextResponse } from 'next/server'
import { getBizplayClientForTerminal } from '@/lib/payment/getBizplayClient'
import { emitTransaction } from '../approve/route'
import { addTransaction } from '@/app/api/transactions/route'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CancelRequest } from '@/types/payment'
import { requireTerminalAuth } from '@/lib/terminal/auth'

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  try {
    const body = await req.json() as CancelRequest & { menuName: string; termId: string }

    const client = await getBizplayClientForTerminal(auth.payload.termId)
    const result = await client.cancel(body)

    if (result.code === '0000' && result.data) {
      const cancelTx = {
        id: crypto.randomUUID(),
        merchantOrderID: body.merchantOrderID,
        tid: result.data.tid,
        menuName: body.menuName,
        userName: '',
        amount: -body.totalAmount,
        status: 'cancelled',
        approvedAt: result.data.cancelledAt,
        createdAt: new Date().toISOString(),
      }
      addTransaction(cancelTx)
      emitTransaction(cancelTx)

      // Supabase transactions 취소 상태 갱신
      ;(async () => {
        try {
          const supabase = createAdminClient()
          const { error } = await supabase
            .from('transactions')
            .update({
              status: 'cancelled',
              cancelled_at: result.data!.cancelledAt ?? new Date().toISOString(),
            })
            .eq('merchant_order_id', body.merchantOrderID)
          if (error) {
            console.error('[cancel] Supabase UPDATE error:', error)
          }
        } catch (err) {
          console.error('[cancel] Supabase UPDATE exception:', err)
        }
      })()
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[cancel] Error:', err)
    return NextResponse.json({ code: 'C002', msg: '서버 오류' }, { status: 500 })
  }
}
