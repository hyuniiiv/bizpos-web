'use client'
import { useState, useEffect, useMemo } from 'react'
import type { Transaction } from '@/types/payment'
import { TransactionRow } from '@/components/admin/TransactionRow'
import { formatDateTime } from '@/lib/utils'
import { useSettingsStore } from '@/lib/store/settingsStore'

type PaymentMethodFilter = '전체' | 'QR' | '바코드' | 'RF카드'
type StatusFilter = '전체' | '정상' | '취소' | '오프라인'

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }

export default function TransactionsPage() {
  const deviceToken = useSettingsStore(state => state.deviceToken)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date().toISOString().substring(0, 10),
  })

  const [menuFilter, setMenuFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('전체')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('전체')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setSelectedIds(new Set())
    try {
      const res = await fetch(`/api/transactions?date=${filters.startDate}&limit=200`, {
        headers: { 'Authorization': `Bearer ${deviceToken ?? ''}` },
      })
      const data = await res.json()
      setTransactions(data.items ?? [])
      setTotal(data.total ?? 0)
      setTotalAmount(data.totalAmount ?? 0)
    } finally {
      setLoading(false)
    }
  }

  const menuNames = useMemo(() => {
    const names = Array.from(new Set(transactions.map(t => t.menuName).filter(Boolean)))
    return names.sort()
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (menuFilter && tx.menuName !== menuFilter) return false
      if (methodFilter !== '전체') {
        const typeMap: Record<PaymentMethodFilter, string> = { '전체': '', 'QR': 'qr', '바코드': 'barcode', 'RF카드': 'rfcard' }
        if (tx.paymentType !== typeMap[methodFilter]) return false
      }
      if (statusFilter !== '전체') {
        const statusMap: Record<StatusFilter, string> = { '전체': '', '정상': 'success', '취소': 'cancelled', '오프라인': 'pending_offline' }
        if (tx.status !== statusMap[statusFilter]) return false
      }
      return true
    })
  }, [transactions, menuFilter, methodFilter, statusFilter])

  const cancelableFiltered = useMemo(() => filtered.filter(tx => tx.status === 'success'), [filtered])
  const allCancelableSelected = cancelableFiltered.length > 0 &&
    cancelableFiltered.every(tx => selectedIds.has(tx.id))

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds(prev => { const next = new Set(prev); checked ? next.add(id) : next.delete(id); return next })
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(cancelableFiltered.map(tx => tx.id)) : new Set())
  }

  const handleCancel = async (tx: Transaction) => {
    if (!confirm(`거래번호 ${tx.merchantOrderID} 를 취소하시겠습니까?`)) return
    const res = await fetch('/api/payment/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken ?? ''}` },
      body: JSON.stringify({ merchantOrderDt: tx.merchantOrderID.substring(0, 8), merchantOrderID: tx.merchantOrderID, tid: tx.tid, totalAmount: tx.amount, menuName: tx.menuName }),
    }).then(r => r.json())
    if (res.code === '0000') { alert('취소 완료'); load() }
    else alert(`취소 실패: ${res.msg}`)
  }

  const handleBatchCancel = async () => {
    const targets = filtered.filter(tx => selectedIds.has(tx.id))
    if (targets.length === 0) return
    if (!confirm(`선택한 ${targets.length}건을 일괄 취소하시겠습니까?`)) return
    let failed = 0
    for (const tx of targets) {
      const res = await fetch('/api/payment/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantOrderDt: tx.merchantOrderID.substring(0, 8), merchantOrderID: tx.merchantOrderID, tid: tx.tid, totalAmount: tx.amount, menuName: tx.menuName }),
      }).then(r => r.json())
      if (res.code !== '0000') failed++
    }
    alert(failed === 0 ? `${targets.length}건 취소 완료` : `${targets.length - failed}건 성공, ${failed}건 실패`)
    load()
  }

  function exportCSV() {
    const headers = ['사용일시', '사용자명', '과정명', '사용금액', '결제방식', '상태']
    const rows = filtered.map(tx => [
      formatDateTime(tx.approvedAt), tx.userName || '', tx.menuName, tx.amount,
      tx.paymentType === 'qr' ? 'QR' : tx.paymentType === 'rfcard' ? 'RF카드' : '바코드',
      tx.status === 'success' ? '정상' : tx.status === 'cancelled' ? '취소' : '오프라인',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `transactions_${filters.startDate}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const selectStyle = `rounded-lg px-4 py-3 text-base text-white focus:outline-none transition-all`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">거래내역 조회</h2>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button onClick={handleBatchCancel}
              className="px-4 py-3 rounded-lg text-base font-medium text-white transition-all"
              style={{ background: 'rgba(239,68,68,0.30)', border: '1px solid rgba(239,68,68,0.50)' }}>
              선택 취소 ({selectedIds.size}건)
            </button>
          )}
          <button onClick={exportCSV}
            className="px-4 py-3 rounded-lg text-base font-medium text-white/70 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
            CSV 다운로드
          </button>
        </div>
      </div>

      {/* 날짜 필터 */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input type="date" className="rounded-lg px-4 py-3 text-base text-white focus:outline-none" style={inputStyle}
          value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
        <span className="text-white/40">~</span>
        <input type="date" className="rounded-lg px-4 py-3 text-base text-white focus:outline-none" style={inputStyle}
          value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
        <button onClick={load}
          className="px-4 py-3 rounded-lg text-base font-medium text-white transition-all"
          style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}>
          조회
        </button>
      </div>

      {/* 세부 필터 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={menuFilter} onChange={e => setMenuFilter(e.target.value)}
          className={selectStyle} style={{ ...inputStyle, background: 'rgba(255,255,255,0.08)' }}>
          <option value="" style={{ background: '#0F1B4C' }}>메뉴 전체</option>
          {menuNames.map(name => <option key={name} value={name} style={{ background: '#0F1B4C' }}>{name}</option>)}
        </select>

        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value as PaymentMethodFilter)}
          className={selectStyle} style={inputStyle}>
          {(['전체', 'QR', '바코드', 'RF카드'] as PaymentMethodFilter[]).map(v => (
            <option key={v} value={v} style={{ background: '#0F1B4C' }}>{v === '전체' ? '결제수단 전체' : v}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className={selectStyle} style={inputStyle}>
          {(['전체', '정상', '취소', '오프라인'] as StatusFilter[]).map(v => (
            <option key={v} value={v} style={{ background: '#0F1B4C' }}>{v === '전체' ? '상태 전체' : v}</option>
          ))}
        </select>

        {(menuFilter || methodFilter !== '전체' || statusFilter !== '전체') && (
          <button onClick={() => { setMenuFilter(''); setMethodFilter('전체'); setStatusFilter('전체') }}
            className="px-4 py-3 rounded-lg text-base text-white/60 hover:text-white/80 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
            필터 초기화
          </button>
        )}
      </div>

      {/* 요약 */}
      <div className="flex gap-4 mb-4 text-base">
        <span className="font-semibold text-white/80">
          {filtered.length !== transactions.length ? `${filtered.length}건 (전체 ${total}건)` : `총 ${total}건`}
        </span>
        <span className="text-white/30">|</span>
        <span className="font-semibold text-white/80">합계 {totalAmount.toLocaleString()}원</span>
      </div>

      {/* 테이블 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <tr>
                <th className="px-4 py-3 text-center w-10">
                  <input type="checkbox" checked={allCancelableSelected}
                    onChange={e => handleSelectAll(e.target.checked)} className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white/50">사용일시</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white/50">사용자명</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white/50">과정명</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white/50">사용금액</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-white/50">결제방식</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-white/50">상태</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-white/50">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-white/40">로딩 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-white/40">조회된 내역이 없습니다</td></tr>
              ) : filtered.map(tx => (
                <TransactionRow key={tx.id} tx={tx} selected={selectedIds.has(tx.id)}
                  onSelect={handleSelect} onCancel={handleCancel} />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-white/10 text-right text-sm text-white/50"
               style={{ background: 'rgba(255,255,255,0.03)' }}>
            {filtered.length !== transactions.length
              ? `필터 결과 ${filtered.length}건 / 전체 ${total}건` : `총 ${total}건`}
            {' / '}합계 {totalAmount.toLocaleString()}원
          </div>
        )}
      </div>
    </div>
  )
}
