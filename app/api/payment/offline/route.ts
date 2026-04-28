import { NextRequest, NextResponse } from 'next/server'
import { getBizplayClientForTerminal } from '@/lib/payment/getBizplayClient'
import { addTransaction } from '@/app/api/transactions/route'
import { emitTransaction } from '@/app/api/payment/approve/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import type { OfflineRecord } from '@/types/payment'

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { records } = body as { records: OfflineRecord[] }

    if (!records?.length) {
      return NextResponse.json({ code: '0000', msg: '동기화 항목 없음', synced: 0, syncedIds: [] })
    }

    // JWT에서 검증된 termId 사용 (records 바디 값 신뢰 금지)
    const termId = auth.payload.termId

    // 모든 레코드가 인증된 단말기 소속인지 검증
    const invalidRecords = records.filter(r => r.termId && r.termId !== termId)
    if (invalidRecords.length > 0) {
      return NextResponse.json(
        { code: 'E403', msg: `허용되지 않은 단말기 레코드 포함: ${invalidRecords.map(r => r.termId).join(', ')}` },
        { status: 403 }
      )
    }

    const client = await getBizplayClientForTerminal(termId)

    // OfflineRecord → Bizplay API 형식 변환
    const bizplayRecords = records.map(rec => ({
      merchantOrderDt: rec.merchantOrderDt,
      merchantOrderID: rec.merchantOrderID,
      rqDtime: rec.merchantOrderDt,
      termId: rec.termId,
      menuName: rec.productName,
      amount: rec.totalAmount,
      barcodeInfo: rec.barcodeInfo,
      barcodeType: rec.barcodeType,
    }))

    // 건별 순차 처리 — 부분 성공 시 성공한 건만 syncedIds에 포함
    const syncedIds: string[] = []
    const supabase = createAdminClient()

    const { data: terminalRow } = await supabase
      .from('terminals')
      .select('id, merchant_id')
      .eq('term_id', termId)
      .single()

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      const bizplayRec = bizplayRecords[i]

      try {
        const result = await client.syncOffline([bizplayRec])
        if (result.code !== '0000') continue  // 실패한 건은 큐에 유지

        const paymentType =
          rec.barcodeType === '3' ? 'rfcard' : rec.barcodeType === '2' ? 'qr' : 'barcode'
        const approvedAt = new Date().toISOString()

        const tx = {
          id: crypto.randomUUID(),
          merchantOrderID: rec.merchantOrderID,
          tid: '',
          menuId: '',
          menuName: rec.productName,
          userName: '',
          amount: rec.totalAmount,
          paymentType,
          voucherType: 'voucher1',
          status: 'offline',
          approvedAt,
          barcodeInfo: rec.barcodeInfo,
          synced: true,
          createdAt: approvedAt,
        }

        if (terminalRow) {
          await supabase.from('transactions').upsert(
            {
              terminal_id: terminalRow.id,
              merchant_id: terminalRow.merchant_id,
              merchant_order_id: rec.merchantOrderID,
              menu_name: rec.productName,
              amount: rec.totalAmount,
              barcode_info: rec.barcodeInfo,
              payment_type: paymentType,
              status: 'offline',
              approved_at: approvedAt,
              synced: true,
              user_name: '',
              tid: '',
            },
            { onConflict: 'merchant_order_id' }
          )
        }

        addTransaction(tx)
        emitTransaction(tx)
        syncedIds.push(rec.merchantOrderID)
      } catch (recErr) {
        console.error(`[offline] record ${rec.merchantOrderID} failed:`, recErr)
      }
    }

    return NextResponse.json({ code: '0000', synced: syncedIds.length, syncedIds })
  } catch (err) {
    console.error('[offline sync] Error:', err)
    return NextResponse.json(
      { code: 'C002', msg: '오프라인 동기화 오류', synced: 0, syncedIds: [] },
      { status: 500 }
    )
  }
}
