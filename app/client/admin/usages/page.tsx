'use client'
import { useEffect, useState } from 'react'
import { DataTable, DataTableRow } from '@/components/ui/DataTable'

interface UsageRow {
  id: string
  meal_type: string
  used_at: string
  amount: number
  employees: { employee_no: string; name: string; department?: string } | null
}

const MEAL_LABEL: Record<string, string> = {
  breakfast: '조식', lunch: '중식', dinner: '석식',
}

const MEAL_COLOR: Record<string, { bg: string; color: string }> = {
  breakfast: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  lunch:     { bg: 'rgba(6,214,160,0.12)',  color: '#06D6A0' },
  dinner:    { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
}

export default function ClientUsagesPage() {
  const [usages, setUsages] = useState<UsageRow[]>([])
  const [from, setFrom] = useState(
    () => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  )
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const fetchUsages = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client/usages?from=${from}&to=${to}`)
      const json = await res.json()
      setUsages(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsages() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">식수 이력</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>{usages.length}건</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>시작일</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>종료일</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
          />
        </div>
        <button
          onClick={fetchUsages}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}
        >
          조회
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
        <DataTable
          columns={[
            { label: '일시' },
            { label: '사원번호', className: 'hidden md:table-cell' },
            { label: '이름' },
            { label: '부서', className: 'hidden md:table-cell' },
            { label: '끼니' },
          ]}
          isEmpty={!loading && usages.length === 0}
          empty="이력이 없습니다."
        >
          {loading ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-white/40">로딩 중...</td>
            </tr>
          ) : usages.map(u => {
            const mc = MEAL_COLOR[u.meal_type] ?? { bg: 'rgba(255,255,255,0.06)', color: 'var(--bp-text-3)' }
            return (
              <DataTableRow key={u.id}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--bp-text-3)' }}>
                  {new Date(u.used_at).toLocaleString('ko-KR')}
                </td>
                <td className="px-4 py-3 font-mono hidden md:table-cell" style={{ color: 'var(--bp-text-3)' }}>
                  {u.employees?.employee_no ?? '-'}
                </td>
                <td className="px-4 py-3 font-medium text-white">{u.employees?.name ?? '-'}</td>
                <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--bp-text-3)' }}>
                  {u.employees?.department ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={mc}
                  >
                    {MEAL_LABEL[u.meal_type] ?? u.meal_type}
                  </span>
                </td>
              </DataTableRow>
            )
          })}
        </DataTable>
      </div>
    </div>
  )
}
