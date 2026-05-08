import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import AlertSettingsClient from './AlertSettingsClient'
import type { AnomalyRule, AnomalyRuleSetting } from '@/types/supabase'

export const revalidate = 0

type RuleKey = AnomalyRule

type SettingsMap = Record<RuleKey, Omit<AnomalyRuleSetting, 'merchant_id'>>

const DEFAULTS: SettingsMap = {
  duplicate_barcode: { rule: 'duplicate_barcode', enabled: true, params: { window_minutes: 10, count_threshold: 2 } },
  high_frequency:    { rule: 'high_frequency',    enabled: true, params: { window_seconds: 60, count_threshold: 10 } },
  high_amount:       { rule: 'high_amount',        enabled: true, params: { amount_threshold: 50000 } },
}

export default async function AlertSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/setup')

  const { data: rows } = await supabase
    .from('anomaly_rule_settings')
    .select('rule, enabled, params')
    .eq('merchant_id', membership.merchant_id)

  const settings: SettingsMap = {
    duplicate_barcode: { ...DEFAULTS.duplicate_barcode, params: { ...DEFAULTS.duplicate_barcode.params } },
    high_frequency:    { ...DEFAULTS.high_frequency,    params: { ...DEFAULTS.high_frequency.params } },
    high_amount:       { ...DEFAULTS.high_amount,       params: { ...DEFAULTS.high_amount.params } },
  }

  for (const row of rows ?? []) {
    const r = row.rule as RuleKey
    if (r in settings) {
      settings[r] = {
        rule: r,
        enabled: row.enabled,
        params: { ...DEFAULTS[r].params, ...(row.params as Record<string, number>) },
      }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/store/admin/alerts"
          className="inline-flex items-center gap-1 text-sm mb-3 transition-colors"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          알림 목록
        </Link>
        <h1 className="text-xl font-bold text-white">이상 알림 규칙 설정</h1>
        <p className="text-sm text-white/50 mt-1">각 규칙의 활성화 여부와 감지 기준을 설정하세요.</p>
      </div>
      <AlertSettingsClient settings={settings} />
    </div>
  )
}
