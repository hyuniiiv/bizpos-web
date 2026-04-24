'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { getPendingPayments } from '@/lib/db/indexeddb'
import { getServerUrl } from '@/lib/serverUrl'
import Link from 'next/link'

interface TxRecord {
  id: string
  merchantOrderID: string
  menuName: string
  userName: string
  amount: number
  status: string
  approvedAt: string
}

interface Props {
  refreshTrigger?: number
}

function formatTime(isoStr: string) {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  } catch {
    return '--:--:--'
  }
}

function formatTimeShort(isoStr: string) {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return '--:--'
  }
}

function formatAmount(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return <span className="text-xs font-semibold" style={{ color: '#06D6A0' }}>승인</span>
  }
  if (status === 'offline') {
    return <span className="text-xs font-semibold text-orange-400">오프라인</span>
  }
  if (status === 'pending_offline') {
    return <span className="text-xs font-semibold text-yellow-400">대기</span>
  }
  return <span className="text-xs text-white/40">{status}</span>
}

export default function RealTimeDashboard({ refreshTrigger }: Props) {
  const { config, isOnline, deviceToken } = useSettingsStore()
  const [txList, setTxList] = useState<TxRecord[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)
  const cafeteriaMode = config.cafeteriaMode ?? false

  const fetchTx = useCallback(async () => {
    try {
      const [res, pending] = await Promise.all([
        fetch(getServerUrl() + `/api/transactions?date=${today}&limit=100`, {
          headers: { 'Authorization': `Bearer ${deviceToken ?? ''}` },
        }),
        getPendingPayments(),
      ])
      if (!res.ok) return
      const data = await res.json()
      const serverItems: TxRecord[] = (data.items ?? []).filter(
        (t: TxRecord) => t.status === 'success' || t.status === 'offline'
      )
      const serverIds = new Set(serverItems.map((t) => t.merchantOrderID))
      const pendingItems: TxRecord[] = pending
        .filter((p) => p.savedAt.startsWith(today) && !serverIds.has(p.merchantOrderID))
        .map((p) => ({
          id: p.merchantOrderID,
          merchantOrderID: p.merchantOrderID,
          menuName: p.productName,
          userName: '(오프라인)',
          amount: p.totalAmount,
          status: 'pending_offline',
          approvedAt: p.savedAt,
        }))
      const merged = [...serverItems, ...pendingItems].sort(
        (a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()
      )
      setTxList(merged)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    fetchTx()
    const interval = setInterval(fetchTx, 30_000)
    return () => clearInterval(interval)
  }, [fetchTx])

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) fetchTx()
  }, [refreshTrigger, fetchTx])

  const successTxs = txList.filter(t => t.status === 'success' || t.status === 'offline' || t.status === 'pending_offline')
  const totalCount = successTxs.length
  const totalAmount = successTxs.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="flex flex-col h-full glass-panel text-white select-none">

      {/* 상단 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10"
           style={{ background: 'rgba(5, 14, 31, 0.40)' }}>
        <div className="flex items-center gap-2">
          <Link href="/pos/admin" className="text-sm text-blue-300 font-mono hover:text-white transition-colors">
            [{config.termId || '--'}]
          </Link>
          {config.corner && (
            <span className="text-sm text-white/40">{config.corner}</span>
          )}
          {cafeteriaMode && (
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: 'rgba(6,214,160,0.15)', color: '#06D6A0' }}>
              학생식당
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          {!isOnline && <span className="text-orange-400 font-semibold">⚠ 오프라인</span>}
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-white/40">{today}</span>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-sm text-blue-300 mb-1">총 거래건</p>
          <p className="text-3xl font-bold text-white">{totalCount}<span className="text-base font-normal ml-1 text-white/60">건</span></p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-sm text-blue-300 mb-1">총 매출액</p>
          <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>
            {totalAmount > 0 ? totalAmount.toLocaleString('ko-KR') : '0'}
            <span className="text-base font-normal ml-1 text-white/60">원</span>
          </p>
        </div>
      </div>

      {/* 거래 목록 헤더 */}
      {cafeteriaMode ? (
        <div className="grid gap-1 px-4 py-1 text-xs text-blue-300/70 border-b border-white/10"
             style={{ gridTemplateColumns: '2rem 3.5rem 1fr 1fr 4rem 3rem' }}>
          <span>번호</span>
          <span>시간</span>
          <span>사용자</span>
          <span>메뉴</span>
          <span className="text-right">금액</span>
          <span className="text-right">상태</span>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_2fr_2fr_1.5fr] gap-1 px-4 py-1 text-xs text-blue-300/70 border-b border-white/10">
          <span>시간</span>
          <span>사용자</span>
          <span>메뉴</span>
          <span className="text-right">금액</span>
        </div>
      )}

      {/* 거래 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-1">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/30 text-base">
            불러오는 중...
          </div>
        ) : txList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
            <span className="text-4xl">📋</span>
            <span className="text-base">오늘 거래 내역이 없습니다</span>
          </div>
        ) : cafeteriaMode ? (
          txList.map((tx, idx) => (
            <div
              key={tx.id}
              className={`grid gap-1 py-2 border-b border-white/5 text-xs
                ${idx === 0 ? 'text-white' : 'text-white/70'}`}
              style={{ gridTemplateColumns: '2rem 3.5rem 1fr 1fr 4rem 3rem' }}
            >
              <span className="text-white/30 font-mono tabular-nums">
                {txList.length - idx}
              </span>
              <span className="text-blue-300/80 font-mono tabular-nums">
                {formatTimeShort(tx.approvedAt)}
              </span>
              <span className="truncate">
                {tx.userName || '-'}
              </span>
              <span className="truncate text-white/60">
                {tx.menuName || '-'}
              </span>
              <span className="text-right font-semibold tabular-nums" style={{ color: '#4ade80' }}>
                {tx.amount.toLocaleString('ko-KR')}
              </span>
              <span className="text-right">
                <StatusBadge status={tx.status} />
              </span>
            </div>
          ))
        ) : (
          txList.map((tx, idx) => (
            <div
              key={tx.id}
              className={`grid grid-cols-[1fr_2fr_2fr_1.5fr] gap-1 py-2 border-b border-white/5 text-base
                ${idx === 0 ? 'text-white' : 'text-white/60'}`}
            >
              <span className="text-xs text-blue-300/80 font-mono">
                {formatTime(tx.approvedAt)}
              </span>
              <span className="truncate">
                {tx.userName || '-'}
              </span>
              <span className="truncate text-white/50">
                {tx.menuName || '-'}
              </span>
              <span className="text-right font-semibold" style={{ color: '#4ade80' }}>
                {formatAmount(tx.amount)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 합계 행 (학생식당 모드) */}
      {cafeteriaMode && totalCount > 0 && (
        <div className="px-4 py-2 border-t border-white/15 flex items-center justify-between text-xs"
             style={{ background: 'rgba(6,214,160,0.06)' }}>
          <span className="font-semibold text-white/60">합계</span>
          <div className="flex items-center gap-4">
            <span className="text-white/60">총 <span className="font-bold text-white">{totalCount}</span>건</span>
            <span style={{ color: '#06D6A0' }} className="font-bold tabular-nums">
              {totalAmount.toLocaleString('ko-KR')}원
            </span>
          </div>
        </div>
      )}

      {/* 하단 스캔 대기 */}
      <div className="px-4 py-3 border-t border-white/10 text-center"
           style={{ background: 'rgba(5, 14, 31, 0.30)' }}>
        <p className="text-sm text-blue-300/70 animate-pulse">
          📡 바코드 스캔 대기 중...
        </p>
      </div>
    </div>
  )
}
