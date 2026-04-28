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
    <div className="grid grid-cols-2 gap-3 px-4 py-3">
      <div className="glass-card rounded-xl p-3 text-center">
        <p className="text-sm text-blue-300 mb-1">총 거래건</p>
        <p className="text-3xl font-bold text-white">
          {totalCount}<span className="text-base font-normal ml-1 text-white/60">건</span>
        </p>
      </div>
      <div className="glass-card rounded-xl p-3 text-center">
        <p className="text-sm text-blue-300 mb-1">총 매출액</p>
        <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>
          {totalAmount > 0 ? totalAmount.toLocaleString('ko-KR') : '0'}
          <span className="text-base font-normal ml-1 text-white/60">원</span>
        </p>
      </div>
    </div>
  )
}
