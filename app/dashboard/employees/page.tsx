'use client'
import { useEffect, useRef, useState } from 'react'
import type { Employee } from '@/types/menu'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchEmployees = async (p = page, query = q) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/merchant/employees?page=${p}&limit=50&q=${encodeURIComponent(query)}`)
      const json = await res.json()
      setEmployees(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchEmployees(1, q)
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').slice(1)
    const rows = lines.map(line => {
      const [employee_no, name, department, card_number, barcode] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      return { employee_no, name, department: department || undefined, card_number: card_number || undefined, barcode: barcode || undefined }
    }).filter(r => r.employee_no && r.name)

    const res = await fetch('/api/merchant/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    if (res.ok) {
      const json = await res.json()
      alert(`${json.count}명 업로드 완료`)
      fetchEmployees()
    } else {
      const err = await res.json()
      alert(`업로드 실패: ${err.message ?? '알 수 없는 오류'}`)
    }
    e.target.value = ''
  }

  const handleToggleActive = async (emp: Employee) => {
    await fetch(`/api/merchant/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !emp.is_active }),
    })
    fetchEmployees()
  }

  const handleCsvDownload = () => {
    const header = 'employee_no,name,department,card_number,barcode\n'
    const rows = employees.map(e =>
      [e.employee_no, e.name, e.department ?? '', e.card_number ?? '', e.barcode ?? ''].join(',')
    ).join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employees.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">사원 관리</h1>
        <div className="flex gap-2">
          <button onClick={handleCsvDownload}
            className="px-4 py-2 text-sm bg-gray-700 rounded hover:bg-gray-600 transition-colors">
            CSV 다운로드
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-500 transition-colors">
            CSV 업로드
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="이름, 사원번호, 부서 검색..."
          className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-600 text-white placeholder-gray-500"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors">
          검색
        </button>
      </form>

      {loading ? (
        <div className="text-gray-400 py-8 text-center">로딩 중...</div>
      ) : employees.length === 0 ? (
        <div className="text-gray-500 py-8 text-center">등록된 사원이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="py-2 px-3">사원번호</th>
                <th className="py-2 px-3">이름</th>
                <th className="py-2 px-3">부서</th>
                <th className="py-2 px-3">카드번호</th>
                <th className="py-2 px-3">바코드</th>
                <th className="py-2 px-3">상태</th>
                <th className="py-2 px-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2 px-3 font-mono">{emp.employee_no}</td>
                  <td className="py-2 px-3 font-medium">{emp.name}</td>
                  <td className="py-2 px-3 text-gray-400">{emp.department ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-400 font-mono text-xs">{emp.card_number ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-400 font-mono text-xs">{emp.barcode ?? '-'}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      emp.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {emp.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <button onClick={() => handleToggleActive(emp)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline">
                      {emp.is_active ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
        <span>총 {total}명</span>
        <div className="flex gap-2">
          {page > 1 && (
            <button onClick={() => setPage(p => p - 1)} className="hover:text-white">← 이전</button>
          )}
          <span>페이지 {page}</span>
          {employees.length === 50 && (
            <button onClick={() => setPage(p => p + 1)} className="hover:text-white">다음 →</button>
          )}
        </div>
      </div>
    </div>
  )
}
