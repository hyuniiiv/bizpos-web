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
    <div className="p-6 flex gap-6 h-full overflow-hidden">
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
        <h1 className="text-xl font-bold mb-4">식수 정산</h1>
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
          <p className="text-sm text-gray-400 mb-2 font-medium">새 정산 생성</p>
          <label className="block text-xs text-gray-500 mb-1">시작일</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 bg-gray-700 rounded text-sm border border-gray-600" />
          <label className="block text-xs text-gray-500 mb-1">종료일</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 bg-gray-700 rounded text-sm border border-gray-600" />
          <button onClick={handleCreate} disabled={creating}
            className="w-full py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-500 disabled:opacity-50">
            {creating ? '생성 중...' : '정산 생성'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {settlements.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">정산 내역이 없습니다.</p>
          ) : settlements.map(s => (
            <button key={s.id} onClick={() => handleSelect(s)}
              className={`w-full text-left p-3 rounded border transition-colors ${
                selected?.settlement.id === s.id
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
              }`}>
              <p className="text-sm font-medium">{s.period_start} ~ {s.period_end}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {s.total_count.toLocaleString()}건 · {s.total_amount.toLocaleString()}원
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                s.status === 'confirmed'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-yellow-900 text-yellow-300'
              }`}>{s.status === 'confirmed' ? '확정' : '초안'}</span>
            </button>
          ))}
        </div>
      </div>
      {selected ? (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {selected.settlement.period_start} ~ {selected.settlement.period_end}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/api/client/settlements/${selected.settlement.id}?format=excel`, '_blank')}
                className="px-3 py-1.5 text-sm bg-green-700 rounded hover:bg-green-600">
                Excel
              </button>
              {selected.settlement.status === 'draft' && (
                <button onClick={() => handleConfirm(selected.settlement.id)}
                  className="px-3 py-1.5 text-sm bg-blue-600 rounded hover:bg-blue-500">
                  정산 확정
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-left">
                  <th className="py-2 px-3">사원번호</th><th className="py-2 px-3">이름</th>
                  <th className="py-2 px-3">부서</th>
                  <th className="py-2 px-3 text-right">조식</th><th className="py-2 px-3 text-right">중식</th>
                  <th className="py-2 px-3 text-right">석식</th><th className="py-2 px-3 text-right">합계</th>
                  <th className="py-2 px-3 text-right">금액(원)</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map(item => (
                  <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-2 px-3 font-mono text-sm">{item.employee_no}</td>
                    <td className="py-2 px-3 font-medium">{item.employee_name}</td>
                    <td className="py-2 px-3 text-gray-400">{item.department ?? '-'}</td>
                    <td className="py-2 px-3 text-right">{item.breakfast_count}</td>
                    <td className="py-2 px-3 text-right">{item.lunch_count}</td>
                    <td className="py-2 px-3 text-right">{item.dinner_count}</td>
                    <td className="py-2 px-3 text-right font-semibold">{item.usage_count}</td>
                    <td className="py-2 px-3 text-right">{item.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>정산을 선택하면 상세 내역을 볼 수 있습니다.</p>
        </div>
      )}
    </div>
  )
}
