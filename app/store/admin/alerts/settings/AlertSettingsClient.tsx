'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { AnomalyRule, AnomalyRuleSetting } from '@/types/supabase'

type RuleKey = AnomalyRule

interface RuleConfig {
  label: string
  description: string
  severityLabel: string
  severityStyle: string
  fields: { key: string; label: string; unit: string; min: number; max: number; step: number }[]
}

const RULE_CONFIG: Record<RuleKey, RuleConfig> = {
  duplicate_barcode: {
    label: '중복 바코드',
    description: '동일 바코드가 짧은 시간 내 여러 번 결제될 때 감지합니다.',
    severityLabel: 'HIGH',
    severityStyle: 'bg-red-500/20 text-red-300',
    fields: [
      { key: 'window_minutes', label: '감지 시간 범위', unit: '분', min: 1, max: 60, step: 1 },
      { key: 'count_threshold', label: '허용 횟수 초과 기준', unit: '회', min: 2, max: 20, step: 1 },
    ],
  },
  high_frequency: {
    label: '고빈도 결제',
    description: '동일 단말기에서 짧은 시간 내 거래가 집중될 때 감지합니다.',
    severityLabel: 'MEDIUM',
    severityStyle: 'bg-yellow-500/20 text-yellow-300',
    fields: [
      { key: 'window_seconds', label: '감지 시간 범위', unit: '초', min: 10, max: 300, step: 10 },
      { key: 'count_threshold', label: '거래 건수 기준', unit: '건', min: 3, max: 50, step: 1 },
    ],
  },
  high_amount: {
    label: '고액 거래',
    description: '단일 거래 금액이 설정 기준을 초과할 때 감지합니다.',
    severityLabel: 'LOW',
    severityStyle: 'bg-white/10 text-white/60',
    fields: [
      { key: 'amount_threshold', label: '금액 기준', unit: '원', min: 10000, max: 500000, step: 5000 },
    ],
  },
}

const RULE_ORDER: RuleKey[] = ['duplicate_barcode', 'high_frequency', 'high_amount']

type SettingsMap = Record<RuleKey, Omit<AnomalyRuleSetting, 'merchant_id'>>

interface Props {
  settings: SettingsMap
}

export default function AlertSettingsClient({ settings: initial }: Props) {
  const [settings, setSettings] = useState<SettingsMap>(initial)
  const [saving, setSaving] = useState<RuleKey | null>(null)

  function updateParam(rule: RuleKey, key: string, value: number) {
    setSettings(prev => ({
      ...prev,
      [rule]: { ...prev[rule], params: { ...prev[rule].params, [key]: value } },
    }))
  }

  function toggleEnabled(rule: RuleKey) {
    setSettings(prev => ({
      ...prev,
      [rule]: { ...prev[rule], enabled: !prev[rule].enabled },
    }))
  }

  async function handleSave(rule: RuleKey) {
    setSaving(rule)
    try {
      const res = await fetch('/api/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule,
          enabled: settings[rule].enabled,
          params: settings[rule].params,
        }),
      })
      if (!res.ok) throw new Error('저장 실패')
      toast.success('설정이 저장되었습니다')
    } catch {
      toast.error('저장에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {RULE_ORDER.map((rule) => {
        const cfg = RULE_CONFIG[rule]
        const s = settings[rule]
        return (
          <section key={rule} className="glass-card rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cfg.severityStyle}`}>
                    {cfg.severityLabel}
                  </span>
                  <h2 className="text-base font-semibold text-white">{cfg.label}</h2>
                </div>
                <p className="text-sm text-white/50">{cfg.description}</p>
              </div>
              <button
                onClick={() => toggleEnabled(rule)}
                className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  s.enabled ? 'bg-blue-500/60' : 'bg-white/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    s.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className={`space-y-3 transition-opacity ${s.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              {cfg.fields.map(({ key, label, unit, min, max, step }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm text-white/60 w-36 flex-shrink-0">{label}</label>
                  <input
                    type="number"
                    value={s.params[key] ?? 0}
                    min={min}
                    max={max}
                    step={step}
                    onChange={e => updateParam(rule, key, Number(e.target.value))}
                    className="w-28 rounded px-3 py-1.5 text-sm text-white text-right font-mono focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
                  />
                  <span className="text-sm text-white/40">{unit}</span>
                </div>
              ))}
            </div>

            <div className="pt-1">
              <button
                onClick={() => handleSave(rule)}
                disabled={saving === rule}
                className="px-4 py-2 rounded text-sm text-white disabled:opacity-50 transition-all"
                style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}
              >
                {saving === rule ? '저장 중...' : '저장'}
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
