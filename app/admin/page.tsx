'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Transaction } from '@/types/payment'
import { SummaryBar } from '@/components/admin/SummaryBar'
import { RealtimeTable } from '@/components/admin/RealtimeTable'

type ConnectionStatus = '연결됨' | '연결 끊김' | '재연결 중'

const SSE_MAX_BACKOFF_MS = 30_000
const SSE_BASE_DELAY_MS = 1_000

export default function AdminRealtimePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('재연결 중')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().substring(0, 10))
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 20
  const abortRef = useRef<AbortController | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef<number>(SSE_BASE_DELAY_MS)

  const connectSSE = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setConnStatus('재연결 중')

    const stored = localStorage.getItem('bizpos-settings')
    const token: string | null = stored
      ? (JSON.parse(stored)?.state?.deviceToken ?? null)
      : null

    fetch('/api/transactions/realtime', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`)
        setConnStatus('연결됨')
        retryDelayRef.current = SSE_BASE_DELAY_MS

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'connected') continue
              const tx = data as Transaction
              setTransactions(prev => [tx, ...prev])
              setTotalCount(c => c + 1)
              setTotalAmount(a => a + (tx.amount > 0 ? tx.amount : 0))
              setNewIds(ids => new Set([...ids, tx.id]))
              setTimeout(() => setNewIds(ids => { const n = new Set(ids); n.delete(tx.id); return n }), 2000)
            } catch {}
          }
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setConnStatus('연결 끊김')
        const delay = retryDelayRef.current
        retryDelayRef.current = Math.min(delay * 2, SSE_MAX_BACKOFF_MS)
        setConnStatus('재연결 중')
        retryTimerRef.current = setTimeout(connectSSE, delay)
      })
  }, [])

  useEffect(() => {
    connectSSE()
    loadTransactions(selectedDate)
    return () => {
      abortRef.current?.abort()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  async function loadTransactions(date: string, page = 1) {
    try {
      const offset = (page - 1) * PAGE_SIZE
      const res = await fetch(`/api/transactions?date=${date}&limit=${PAGE_SIZE}&offset=${offset}`, {
        headers: { 'X-Internal-Key': process.env.NEXT_PUBLIC_INTERNAL_POS_KEY ?? '' },
      })
      const data = await res.json()
      setTransactions(data.items ?? [])
      setTotalCount(data.total ?? 0)
      setTotalAmount(data.totalAmount ?? 0)
    } catch {}
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setCurrentPage(1)
    loadTransactions(date, 1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadTransactions(selectedDate, page)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">실시간 거래관리</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            connStatus === '연결됨' ? 'bg-green-400 animate-pulse' :
            connStatus === '재연결 중' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-500'
          }`} />
          <span className={`text-sm font-medium ${
            connStatus === '연결됨' ? 'text-green-400' :
            connStatus === '재연결 중' ? 'text-yellow-400' :
            'text-red-400'
          }`}>{connStatus}</span>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={e => handleDateChange(e.target.value)}
          className="rounded-lg px-4 py-3 text-base text-white focus:outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
        />
        <button
          onClick={() => loadTransactions(selectedDate)}
          className="px-4 py-3 rounded-lg text-base font-medium text-white transition-all"
          style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}
        >
          새로고침
        </button>
      </div>

      <SummaryBar totalCount={totalCount} totalAmount={totalAmount} />

      <RealtimeTable
        transactions={transactions}
        newIds={newIds}
        totalCount={totalCount}
        totalAmount={totalAmount}
        page={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
