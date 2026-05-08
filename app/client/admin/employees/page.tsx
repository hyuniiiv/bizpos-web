'use client'
import { useEffect, useRef, useState } from 'react'
import { Upload, Download, Search } from 'lucide-react'
import type { Employee } from '@/types/menu'
import { DataTable, DataTableRow } from '@/components/ui/DataTable'

export default function ClientEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchEmployees = async (p = page, query = q) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client/employees?page=${p}&limit=50&q=${encodeURIComponent(query)}`)
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
      const [employee_no, name, department, card_number, barcode] =
        line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      return {
        employee_no, name,
        department: department || undefined,
        card_number: card_number || undefined,
        barcode: barcode || undefined,
      }
    }).filter(r => r.employee_no && r.name)

    const res = await fetch('/api/client/employees', {
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
      alert(`업로드 실패: ${err.error ?? '알 수 없는 오류'}`)
    }
    e.target.value = ''
  }

  const handleToggleActive = async (emp: Employee) => {
    await fetch(`/api/client/employees/${emp.id}`, {
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
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'employees.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">사원 관리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>총 {total}명</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCsvDownload}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
            style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
          >
            <Download className="w-4 h-4" />CSV 다운로드
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}
          >
            <Upload className="w-4 h-4" />CSV 업로드
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--bp-text-3)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="이름, 사원번호, 부서 검색..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}
        >
          검색
        </button>
      </form>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
        <DataTable
          columns={[
            { label: '사원번호' },
            { label: '이름' },
            { label: '부서', className: 'hidden md:table-cell' },
            { label: '카드번호', className: 'hidden lg:table-cell' },
            { label: '바코드', className: 'hidden lg:table-cell' },
            { label: '상태' },
            { label: '' },
          ]}
          isEmpty={!loading && employees.length === 0}
          empty="등록된 사원이 없습니다."
        >
          {loading ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-white/40">로딩 중...</td>
            </tr>
          ) : employees.map(emp => (
            <DataTableRow key={emp.id}>
              <td className="px-4 py-3 font-mono text-sm text-white">{emp.employee_no}</td>
              <td className="px-4 py-3 font-medium text-white">{emp.name}</td>
              <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--bp-text-3)' }}>{emp.department ?? '-'}</td>
              <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs" style={{ color: 'var(--bp-text-3)' }}>{emp.card_number ?? '-'}</td>
              <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs" style={{ color: 'var(--bp-text-3)' }}>{emp.barcode ?? '-'}</td>
              <td className="px-4 py-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: emp.is_active ? 'rgba(6,214,160,0.12)' : 'rgba(255,255,255,0.06)',
                    color: emp.is_active ? '#06D6A0' : 'var(--bp-text-3)',
                  }}
                >
                  {emp.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleToggleActive(emp)}
                  className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
                >
                  {emp.is_active ? '비활성화' : '활성화'}
                </button>
              </td>
            </DataTableRow>
          ))}
        </DataTable>
      </div>

      {(page > 1 || employees.length === 50) && (
        <div className="mt-4 flex items-center justify-between text-sm" style={{ color: 'var(--bp-text-3)' }}>
          <span>총 {total}명 · 페이지 {page}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <button
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ border: '1px solid var(--bp-border)' }}
              >
                ← 이전
              </button>
            )}
            {employees.length === 50 && (
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ border: '1px solid var(--bp-border)' }}
              >
                다음 →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
