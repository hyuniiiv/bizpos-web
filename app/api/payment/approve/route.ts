import { NextRequest, NextResponse } from 'next/server'
import { getBizplayClientForTerminal } from '@/lib/payment/getBizplayClient'
import type { ApprovalRequest } from '@/types/payment'
import { addTransaction } from '@/app/api/transactions/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'

// SSE 브로드캐스트용 이벤트 맵
export const transactionEmitter = new Map<string, ((data: object) => void)[]>()

export function emitTransaction(data: object) {
  transactionEmitter.forEach(listeners => {
    listeners.forEach(fn => fn(data))
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  try {
    const body = await req.json() as ApprovalRequest & {
      menuId: string
      menuName: string
      barcodeInfo: string
      termId: string
    }

    // JWT에서 검증된 termId 사용 (바디 값 신뢰 금지)
    const termId = auth.payload.termId
    const client = await getBizplayClientForTerminal(termId)
    const result = await client.approve(body)

    if (result.code === '0000' && result.data) {
      const tx = {
        id: crypto.randomUUID(),
        merchantOrderID: body.merchantOrderID,
        tid: result.data.tid,
        menuId: body.menuId,
        menuName: body.menuName,
        userName: result.data.userName ?? '',
        amount: result.data.usedAmount ?? body.totalAmount,
        paymentType: 'barcode',
        voucherType: 'voucher1',
        status: 'success',
        approvedAt: result.data.approvedAt,
        barcodeInfo: body.barcodeInfo,
        termId,
        synced: true,
        createdAt: new Date().toISOString(),
      }
      // 거래내역 저장 + SSE 브로드캐스트
      addTransaction(tx)
      emitTransaction(tx)

      // Supabase transactions 테이블에 직접 INSERT (비동기, 실패해도 결제 응답에 영향 없음)
      const approvedData = result.data
      ;(async () => {
        try {
          const supabase = createAdminClient()
          const { error } = await supabase.from('transactions').insert({
            terminal_id: termId,
            merchant_order_id: body.merchantOrderID,
            tid: approvedData.tid ?? '',
            menu_name: body.menuName ?? '',
            amount: approvedData.usedAmount ?? body.totalAmount,
            payment_type: 'barcode',
            status: 'approved',
            approved_at: approvedData.approvedAt ?? new Date().toISOString(),
            user_name: approvedData.userName ?? '',
            synced: true,
          })
          if (error) {
            console.error('[approve] Supabase INSERT error:', error)
          }
        } catch (err) {
          console.error('[approve] Supabase INSERT exception:', err)
        }
      })()

      return NextResponse.json({ ...result, transaction: tx })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[approve] Error:', err)
    return NextResponse.json({ code: 'C002', msg: '서버 오류' }, { status: 500 })
  }
}
