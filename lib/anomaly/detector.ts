import { createAdminClient } from '@/lib/supabase/admin'

interface TxInput {
  id: string
  merchant_id: string
  terminal_id: string
  barcode_info: string | null
  amount: number
  approved_at: string
}

export async function detectAnomalies(tx: TxInput): Promise<void> {
  const supabase = createAdminClient()
  const now = new Date(tx.approved_at)

  // Rule-01: 동일 바코드 10분 내 2회 이상
  if (tx.barcode_info) {
    const since = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', tx.merchant_id)
      .eq('barcode_info', tx.barcode_info)
      .eq('status', 'success')
      .gte('approved_at', since)

    if ((count ?? 0) >= 2) {
      await supabase.from('anomaly_alerts').insert({
        merchant_id: tx.merchant_id,
        terminal_id: tx.terminal_id,
        transaction_id: tx.id,
        rule: 'duplicate_barcode',
        severity: 'HIGH',
        detail: { barcode_info: tx.barcode_info, count, window_minutes: 10 },
      })
    }
  }

  // Rule-02: 동일 단말기 1분 내 10건 이상
  {
    const since = new Date(now.getTime() - 60 * 1000).toISOString()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('terminal_id', tx.terminal_id)
      .eq('status', 'success')
      .gte('approved_at', since)

    if ((count ?? 0) >= 10) {
      await supabase.from('anomaly_alerts').insert({
        merchant_id: tx.merchant_id,
        terminal_id: tx.terminal_id,
        transaction_id: tx.id,
        rule: 'high_frequency',
        severity: 'MEDIUM',
        detail: { count, window_seconds: 60 },
      })
    }
  }

  // Rule-03: 단일 거래 50,000원 이상
  if (tx.amount >= 50000) {
    await supabase.from('anomaly_alerts').insert({
      merchant_id: tx.merchant_id,
      terminal_id: tx.terminal_id,
      transaction_id: tx.id,
      rule: 'high_amount',
      severity: 'LOW',
      detail: { amount: tx.amount, threshold: 50000 },
    })
  }
}
