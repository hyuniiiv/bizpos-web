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
    const body = await req.json() as CancelRequest & {
      menuName: string
      termId: string
      merchantCancelDt?: string
      merchantCancelID?: string
      totalCancelAmount?: number
      cancelTaxFreeAmount?: number
      cancelVatAmount?: number
      partYn?: string
    }

    // BizPlay 명세 필수 필드 자동 보강 (전체 취소 기본)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
    if (!body.merchantCancelDt) body.merchantCancelDt = today
    if (!body.merchantCancelID) body.merchantCancelID = `${body.merchantOrderID}C${Date.now()}`
    if (body.totalCancelAmount === undefined) body.totalCancelAmount = body.totalAmount
    if (body.cancelTaxFreeAmount === undefined) body.cancelTaxFreeAmount = body.totalAmount
    if (body.cancelVatAmount === undefined) body.cancelVatAmount = 0
    if (!body.partYn) body.partYn = 'N'

    console.log(`[cancel] termId=${auth.payload.termId} merchantOrderID=${body.merchantOrderID} cancelID=${body.merchantCancelID} totalAmount=${body.totalAmount} cancelAmount=${body.totalCancelAmount} partYn=${body.partYn}`)

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
      try {
        addTransaction(cancelTx)
        emitTransaction(cancelTx)
      } catch (err) {
        console.error('[cancel] addTransaction/emit failed:', err instanceof Error ? err.message : String(err))
      }

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
