'use client'
import { useEffect, useState } from 'react'

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">식수 이력</h1>
      <div className="flex gap-2 mb-4 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">시작일</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-2 py-1.5 bg-gray-800 rounded border border-gray-600 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">종료일</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-2 py-1.5 bg-gray-800 rounded border border-gray-600 text-sm" />
        </div>
        <button onClick={fetchUsages}
          className="px-4 py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-500 transition-colors">
          조회
        </button>
      </div>
      {loading ? (
        <div className="text-gray-400 py-8 text-center">로딩 중...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="py-2 px-3">일시</th>
                <th className="py-2 px-3">사원번호</th>
                <th className="py-2 px-3">이름</th>
                <th className="py-2 px-3">부서</th>
                <th className="py-2 px-3">끼니</th>
              </tr>
            </thead>
            <tbody>
              {usages.map(u => (
                <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="py-2 px-3 font-mono text-xs">
                    {new Date(u.used_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="py-2 px-3 font-mono">{u.employees?.employee_no ?? '-'}</td>
                  <td className="py-2 px-3 font-medium">{u.employees?.name ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-400">{u.employees?.department ?? '-'}</td>
                  <td className="py-2 px-3">{MEAL_LABEL[u.meal_type] ?? u.meal_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {usages.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">이력이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}
