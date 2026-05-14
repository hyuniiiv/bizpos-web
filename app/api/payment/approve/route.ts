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
      paymentType?: string
    }

    // JWT에서 검증된 termId 사용 (바디 값 신뢰 금지)
    const termId = auth.payload.termId
    const terminalId = auth.payload.terminalId

    const supabaseForName = createAdminClient()
    const { data: terminalRow } = await supabaseForName
      .from('terminals')
      .select('name, status, store_id')
      .eq('id', terminalId)
      .single()
    const terminalName = terminalRow?.name ?? ''

    if (terminalRow?.status === 'inactive')
      return NextResponse.json({ error: 'TERMINAL_INACTIVE', message: '비활성화된 단말기입니다' }, { status: 403 })

    if (terminalRow?.store_id) {
      const { data: store } = await supabaseForName
        .from('stores').select('is_active, merchant_id').eq('id', terminalRow.store_id).single()
      if (store && !store.is_active)
        return NextResponse.json({ error: 'STORE_INACTIVE', message: '비활성화된 매장입니다' }, { status: 403 })
      if (store?.merchant_id) {
        const { data: merchant } = await supabaseForName
          .from('merchants').select('is_active').eq('id', store.merchant_id).single()
        if (merchant && merchant.is_active === false)
          return NextResponse.json({ error: 'MERCHANT_INACTIVE', message: '비활성화된 가맹점입니다' }, { status: 403 })
      }
    }

    // 진단: 클라이언트가 보낸 tid/token 유무 확인 (값 자체는 마스킹)
    console.log(`[approve] termId=${termId} merchantOrderID=${body.merchantOrderID} hasTid=${Boolean(body.tid)} tidLen=${body.tid ? String(body.tid).length : 0} hasToken=${Boolean(body.token)} tokenLen=${body.token ? String(body.token).length : 0}`)

    const client = await getBizplayClientForTerminal(termId)
    const result = await client.approve(body)

    if (result.code === '0000' && result.data) {
      // usedAmount 불일치 감지 (정책상 거절하지 않되, 모니터링을 위해 경고 로그)
      if (result.data.usedAmount !== undefined && result.data.usedAmount !== body.totalAmount) {
        console.warn('[approve] amount mismatch', body.totalAmount, result.data.usedAmount)
      }

      const tx = {
        id: crypto.randomUUID(),
        merchantOrderID: body.merchantOrderID,
        tid: result.data.tid,
        menuId: body.menuId,
        menuName: body.menuName,
        userName: result.data.userName ?? '',
        amount: result.data.usedAmount ?? body.totalAmount,
        paymentType: body.paymentType ?? 'barcode',
        voucherType: 'voucher1',
        status: 'success',
        approvedAt: result.data.approvedAt,
        barcodeInfo: body.barcodeInfo,
        termId,
        terminalName,
        synced: true,
        createdAt: new Date().toISOString(),
      }
      // 거래내역 저장 + SSE 브로드캐스트 (실패해도 Supabase 영구 저장은 진행)
      try {
        addTransaction(tx)
        emitTransaction(tx)
      } catch (err) {
        console.error('[approve] addTransaction/emit failed:', err instanceof Error ? err.message : String(err))
      }

      // Supabase transactions 테이블에 직접 INSERT (비동기, 실패해도 결제 응답에 영향 없음)
      const approvedData = result.data
      ;(async () => {
        try {
          const supabase = createAdminClient()
          const { error } = await supabase.from('transactions').insert({
            terminal_id: termId,
            terminal_name: terminalName,
            merchant_order_id: body.merchantOrderID,
            tid: approvedData.tid ?? '',
            menu_name: body.menuName ?? '',
            amount: approvedData.usedAmount ?? body.totalAmount,
            payment_type: body.paymentType ?? 'barcode',
            status: 'success',
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
