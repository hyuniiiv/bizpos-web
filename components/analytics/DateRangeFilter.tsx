'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Preset = 'today' | 'week' | 'month' | 'custom'

const PRESETS: { label: string; value: Preset }[] = [
  { label: '오늘', value: 'today' },
  { label: '이번 주', value: 'week' },
  { label: '이번 달', value: 'month' },
  { label: '직접 선택', value: 'custom' },
]

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', colorScheme: 'dark' }

interface Props {
  preset: Preset
  from: string
  to: string
}

export default function DateRangeFilter({ preset, from, to }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => sp.set(k, v))
    router.push(`/store/admin/analytics?${sp.toString()}`)
  }

  function handlePreset(p: Preset) {
    if (p === 'custom') return
    navigate({ preset: p })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1">
        {PRESETS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handlePreset(value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={preset === value
              ? { background: 'rgba(96,165,250,0.35)', border: '1px solid rgba(96,165,250,0.55)', color: 'white' }
              : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => navigate({ preset: 'custom', from: e.target.value, to })}
            className="rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
            style={inputStyle}
          />
          <span className="text-white/40">~</span>
          <input
            type="date"
            value={to}
            onChange={(e) => navigate({ preset: 'custom', from, to: e.target.value })}
            className="rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
            style={inputStyle}
          />
        </div>
      )}

      {preset !== 'custom' && (
        <span className="text-sm text-white/40">
          {from} ~ {to}
        </span>
      )}
    </div>
  )
}
