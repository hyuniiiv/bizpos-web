'use client'
import { useEffect, useState } from 'react'
import type { Settlement, SettlementItem } from '@/types/menu'

export default function ClientSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selected, setSelected] = useState<{ settlement: Settlement; items: SettlementItem[] } | null>(null)
  const [creating, setCreating] = useState(false)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const fetchSettlements = async () => {
    const res = await fetch('/api/client/settlements')
    if (!res.ok) return
    const json = await res.json()
    setSettlements(json.data ?? [])
  }

  useEffect(() => { fetchSettlements() }, [])

  const handleCreate = async () => {
    if (!periodStart || !periodEnd) { alert('기간을 선택해주세요.'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/client/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
      })
      if (res.ok) await fetchSettlements()
      else alert('정산 생성 실패')
    } finally { setCreating(false) }
  }

  const handleSelect = async (s: Settlement) => {
    const res = await fetch(`/api/client/settlements/${s.id}`)
    if (!res.ok) return
    const json = await res.json()
    setSelected({ settlement: json.data, items: json.items ?? [] })
  }

  const handleConfirm = async (id: string) => {
    if (!confirm('정산을 확정하시겠습니까? 이후 수정이 불가합니다.')) return
    const res = await fetch(`/api/client/settlements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    if (res.ok) {
      await fetchSettlements()
      if (selected?.settlement.id === id) {
        await handleSelect({ ...selected.settlement, status: 'confirmed' })
      }
    }
  }

  return (
    <div className="flex gap-6 h-full overflow-hidden">
      {/* 목록 패널 */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
        <h1 className="text-xl font-bold text-white mb-4">식수 정산</h1>

        <div className="mb-4 p-4 rounded-xl space-y-3" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--bp-text-3)' }}>새 정산 생성</p>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>시작일</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>종료일</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }} />
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}>
            {creating ? '생성 중…' : '정산 생성'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {settlements.length === 0 ? (
            <p className="text-center py-4 text-sm" style={{ color: 'var(--bp-text-3)' }}>정산 내역이 없습니다.</p>
          ) : settlements.map(s => (
            <button key={s.id} onClick={() => handleSelect(s)}
              className="w-full text-left p-3 rounded-xl transition-colors"
              style={{
                background: selected?.settlement.id === s.id ? 'rgba(6,214,160,0.08)' : 'var(--bp-surface)',
                border: `1px solid ${selected?.settlement.id === s.id ? '#06D6A0' : 'var(--bp-border)'}`,
              }}>
              <p className="text-sm font-medium text-white">{s.period_start} ~ {s.period_end}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
                {s.total_count.toLocaleString()}건 · {s.total_amount.toLocaleString()}원
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium"
                style={{
                  background: s.status === 'confirmed' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)',
                  color: s.status === 'confirmed' ? '#06D6A0' : '#fbbf24',
                }}>
                {s.status === 'confirmed' ? '확정' : '초안'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 상세 패널 */}
      {selected ? (
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                {selected.settlement.period_start} ~ {selected.settlement.period_end}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
                {selected.settlement.status === 'confirmed' ? '확정됨' : '초안'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/api/client/settlements/${selected.settlement.id}?format=excel`, '_blank')}
                className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-white/10"
                style={{ color: '#06D6A0', border: '1px solid rgba(6,214,160,0.3)' }}>
                Excel
              </button>
              {selected.settlement.status === 'draft' && (
                <button onClick={() => handleConfirm(selected.settlement.id)}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}>
                  정산 확정
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: '총 이용 건수', value: `${selected.settlement.total_count.toLocaleString()}건` },
              { label: '총 금액', value: `${selected.settlement.total_amount.toLocaleString()}원` },
              { label: '사원 수', value: `${selected.items.length}명` },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-3 rounded-xl" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--bp-text-3)' }}>{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <table className="w-full text-sm">
              <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <tr>
                  {['사원번호', '이름', '부서', '조식', '중식', '석식', '합계', '금액(원)'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-white/50 font-medium ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.items.map(item => (
                  <tr key={item.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-white">{item.employee_no}</td>
                    <td className="px-4 py-3 font-medium text-white">{item.employee_name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--bp-text-3)' }}>{item.department ?? '-'}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--bp-text-3)' }}>{item.breakfast_count}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--bp-text-3)' }}>{item.lunch_count}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--bp-text-3)' }}>{item.dinner_count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{item.usage_count}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">{item.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/20 font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-white">합계</td>
                  <td className="px-4 py-3 text-right text-white">{selected.items.reduce((s, i) => s + i.breakfast_count, 0)}</td>
                  <td className="px-4 py-3 text-right text-white">{selected.items.reduce((s, i) => s + i.lunch_count, 0)}</td>
                  <td className="px-4 py-3 text-right text-white">{selected.items.reduce((s, i) => s + i.dinner_count, 0)}</td>
                  <td className="px-4 py-3 text-right text-white">{selected.settlement.total_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-white">{selected.settlement.total_amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--bp-text-3)' }}>
          <p>정산을 선택하면 상세 내역을 볼 수 있습니다.</p>
        </div>
      )}
    </div>
  )
}
