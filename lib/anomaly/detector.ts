import { createAdminClient } from '@/lib/supabase/admin'

interface TxInput {
  id: string
  merchant_id: string
  terminal_id: string
  barcode_info: string | null
  amount: number
  approved_at: string
}

type RuleKey = 'duplicate_barcode' | 'high_frequency' | 'high_amount'

interface RuleSetting {
  enabled: boolean
  params: Record<string, number>
}

const DEFAULTS: Record<RuleKey, RuleSetting> = {
  duplicate_barcode: { enabled: true, params: { window_minutes: 10, count_threshold: 2 } },
  high_frequency:    { enabled: true, params: { window_seconds: 60, count_threshold: 10 } },
  high_amount:       { enabled: true, params: { amount_threshold: 50000 } },
}

const SEVERITY: Record<RuleKey, 'HIGH' | 'MEDIUM' | 'LOW'> = {
  duplicate_barcode: 'HIGH',
  high_frequency:    'MEDIUM',
  high_amount:       'LOW',
}

async function loadRules(merchantId: string): Promise<Record<RuleKey, RuleSetting>> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('anomaly_rule_settings')
      .select('rule, enabled, params')
      .eq('merchant_id', merchantId)

    if (!data?.length) return { ...DEFAULTS }

    const result: Record<RuleKey, RuleSetting> = {
      duplicate_barcode: { ...DEFAULTS.duplicate_barcode, params: { ...DEFAULTS.duplicate_barcode.params } },
      high_frequency:    { ...DEFAULTS.high_frequency,    params: { ...DEFAULTS.high_frequency.params } },
      high_amount:       { ...DEFAULTS.high_amount,       params: { ...DEFAULTS.high_amount.params } },
    }
    for (const row of data) {
      const rule = row.rule as RuleKey
      if (rule in result) {
        result[rule] = {
          enabled: row.enabled,
          params: { ...DEFAULTS[rule].params, ...(row.params as Record<string, number>) },
        }
      }
    }
    return result
  } catch {
    return { ...DEFAULTS }
  }
}

export async function detectAnomalies(tx: TxInput): Promise<void> {
  const supabase = createAdminClient()
  const now = new Date(tx.approved_at)
  const rules = await loadRules(tx.merchant_id)

  // Rule-01: 동일 바코드 N분 내 M회 이상
  if (tx.barcode_info && rules.duplicate_barcode.enabled) {
    const { window_minutes = 10, count_threshold = 2 } = rules.duplicate_barcode.params
    const since = new Date(now.getTime() - window_minutes * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', tx.merchant_id)
      .eq('barcode_info', tx.barcode_info)
      .eq('status', 'success')
      .gte('approved_at', since)

    if ((count ?? 0) >= count_threshold) {
      await supabase.from('anomaly_alerts').insert({
        merchant_id: tx.merchant_id,
        terminal_id: tx.terminal_id,
        transaction_id: tx.id,
        rule: 'duplicate_barcode',
        severity: SEVERITY.duplicate_barcode,
        detail: { barcode_info: tx.barcode_info, count, window_minutes },
      })
    }
  }

  // Rule-02: 동일 단말기 N초 내 M건 이상
  if (rules.high_frequency.enabled) {
    const { window_seconds = 60, count_threshold = 10 } = rules.high_frequency.params
    const since = new Date(now.getTime() - window_seconds * 1000).toISOString()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('terminal_id', tx.terminal_id)
      .eq('status', 'success')
      .gte('approved_at', since)

    if ((count ?? 0) >= count_threshold) {
      await supabase.from('anomaly_alerts').insert({
        merchant_id: tx.merchant_id,
        terminal_id: tx.terminal_id,
        transaction_id: tx.id,
        rule: 'high_frequency',
        severity: SEVERITY.high_frequency,
        detail: { count, window_seconds },
      })
    }
  }

  // Rule-03: 단일 거래 N원 이상
  if (rules.high_amount.enabled) {
    const { amount_threshold = 50000 } = rules.high_amount.params
    if (tx.amount >= amount_threshold) {
      await supabase.from('anomaly_alerts').insert({
        merchant_id: tx.merchant_id,
        terminal_id: tx.terminal_id,
        transaction_id: tx.id,
        rule: 'high_amount',
        severity: SEVERITY.high_amount,
        detail: { amount: tx.amount, threshold: amount_threshold },
      })
    }
  }
}
