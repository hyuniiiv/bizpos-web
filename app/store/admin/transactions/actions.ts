'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBizplayClientForTerminal } from '@/lib/payment/getBizplayClient'

export async function cancelTransaction(params: {
  merchantOrderID: string
  tid: string
  amount: number
  menuName: string
  termId: string
}): Promise<{ code: string; msg: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { code: 'AUTH', msg: '인증이 필요합니다' }

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  // 명세: merchantCancelDt = YYYYMMDD 8자리 (String(8))
  const cancelDt = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  // 고유성을 위해 cancelID는 시간초까지 포함
  const cancelDtFull = `${cancelDt}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  try {
    const client = await getBizplayClientForTerminal(params.termId)
    const result = await client.cancel({
      merchantOrderDt: params.merchantOrderID.substring(0, 8),
      merchantOrderID: params.merchantOrderID,
      merchantCancelDt: cancelDt,
      merchantCancelID: `C${cancelDtFull}`,
      tid: params.tid,
      totalAmount: params.amount,
      totalCancelAmount: params.amount,
      cancelTaxFreeAmount: params.amount,
      partYn: 'N',
    })

    if (result.code === '0000') {
      const admin = createAdminClient()
      await admin
        .from('transactions')
        .update({ status: 'cancelled', cancelled_at: result.data?.cancelledAt ?? now.toISOString() })
        .eq('merchant_order_id', params.merchantOrderID)
    }

    return { code: result.code, msg: result.msg }
  } catch {
    return { code: 'C002', msg: '서버 오류' }
  }
}
