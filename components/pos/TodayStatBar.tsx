'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { getServerUrl } from '@/lib/serverUrl'
import { getPendingPayments } from '@/lib/db/indexeddb'

interface Props {
  refreshTrigger?: number
}

export default function TodayStatBar({ refreshTrigger }: Props) {
  const { deviceToken } = useSettingsStore()
  const [totalCount, setTotalCount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const today = new Date().toISOString().slice(0, 10)

  const fetchStats = useCallback(async () => {
    try {
      const [res, pending] = await Promise.all([
        fetch(getServerUrl() + `/api/transactions?date=${today}&limit=200`, {
          headers: { 'Authorization': `Bearer ${deviceToken ?? ''}` },
        }),
        getPendingPayments(),
      ])
      if (!res.ok) return
      const data = await res.json()
      const serverItems = (data.items ?? []).filter(
        (t: { status: string }) => t.status === 'success' || t.status === 'offline'
      )
      const pendingToday = pending.filter(p => p.savedAt.startsWith(today))
      const pendingAmount = pendingToday.reduce((s: number, p) => s + p.totalAmount, 0)
      setTotalCount(serverItems.length + pendingToday.length)
      setTotalAmount((data.totalAmount ?? 0) + pendingAmount)
    } catch {
      // ignore
    }
  }, [today, deviceToken])

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 30_000)
    return () => clearInterval(id)
  }, [fetchStats])

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) fetchStats()
  }, [refreshTrigger, fetchStats])

  return (
    <div className="flex items-center gap-4 px-5 py-2.5 border-b"
      style={{ background: 'rgba(5,14,31,0.35)', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/40">총 거래건</span>
        <span className="text-lg font-bold text-white tabular-nums">
          {totalCount}<span className="text-xs font-normal text-white/50 ml-0.5">건</span>
        </span>
      </div>
      <span className="text-white/15">|</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/40">총 매출액</span>
        <span className="text-lg font-bold tabular-nums" style={{ color: '#4ade80' }}>
          {totalAmount.toLocaleString()}<span className="text-xs font-normal text-white/50 ml-0.5">원</span>
        </span>
      </div>
    </div>
  )
}
