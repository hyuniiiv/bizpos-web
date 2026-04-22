'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Activity, Monitor } from 'lucide-react'

type Terminal = {
  id: string
  name: string | null
  term_id: string
  corner: string | null
  status: string
  last_seen_at: string | null
}

type RecentTx = {
  id: string
  menu_name: string
  amount: number
  payment_type: string
  status: string
  approved_at: string
}

type Props = {
  merchantId: string
  initialTerminals: Terminal[]
  initialRecentTxs: RecentTx[]
  initialTodayAmount: number
  initialTodayCount: number
}

export default function DashboardClient({
  merchantId,
  initialTerminals,
  initialRecentTxs,
  initialTodayAmount,
  initialTodayCount,
}: Props) {
  const [terminals, setTerminals] = useState<Terminal[]>(initialTerminals)
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>(initialRecentTxs)
  const [todayAmount, setTodayAmount] = useState(initialTodayAmount)
  const [todayCount, setTodayCount] = useState(initialTodayCount)

  useEffect(() => {
    const supabase = createClient()

    const terminalsChannel = supabase
      .channel('dashboard-terminals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'terminals', filter: `merchant_id=eq.${merchantId}` },
        async () => {
          const { data } = await supabase
            .from('terminals')
            .select('id, name, term_id, corner, status, last_seen_at')
            .eq('merchant_id', merchantId)
            .order('term_id')
          if (data) setTerminals(data)
        }
      )
      .subscribe()

    const transactionsChannel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `merchant_id=eq.${merchantId}` },
        async () => {
          const { data: recent } = await supabase
            .from('transactions')
            .select('id, menu_name, amount, payment_type, status, approved_at')
            .eq('merchant_id', merchantId)
            .order('approved_at', { ascending: false })
            .limit(10)
          if (recent) setRecentTxs(recent)

          const today = new Date().toISOString().slice(0, 10)
          const { data: todayTxs } = await supabase
            .from('transactions')
            .select('amount, status')
            .eq('merchant_id', merchantId)
            .gte('approved_at', `${today}T00:00:00Z`)
            .eq('status', 'success')
          if (todayTxs) {
            setTodayAmount(todayTxs.reduce((s, t) => s + t.amount, 0))
            setTodayCount(todayTxs.length)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(terminalsChannel)
      supabase.removeChannel(transactionsChannel)
    }
  }, [merchantId])

  const onlineCount = terminals.filter(t => t.status === 'online').length

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--bp-text)' }}>대시보드</h1>

      {/* 요약 메트릭 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="오늘 매출"
          value={`₩${todayAmount.toLocaleString()}`}
          icon={TrendingUp}
          iconColor="#06D6A0"
          iconBg="rgba(6,214,160,0.12)"
        />
        <SummaryCard
          label="오늘 거래건수"
          value={`${todayCount}건`}
          icon={Activity}
          iconColor="#34d399"
          iconBg="rgba(52,211,153,0.12)"
        />
        <SummaryCard
          label="온라인 단말기"
          value={`${onlineCount} / ${terminals.length}대`}
          icon={Monitor}
          iconColor="#a78bfa"
          iconBg="rgba(167,139,250,0.12)"
        />
      </div>

      {/* 단말기 현황 */}
      <div className="bp-card rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: 'var(--bp-text-3)' }}>단말기 현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {terminals.map(t => (
            <div key={t.id} className="bp-panel rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'online' ? 'animate-pulse' : ''}`}
                  style={{
                    background: t.status === 'online' ? '#06D6A0' : 'rgba(255,255,255,0.15)',
                    boxShadow: t.status === 'online' ? '0 0 6px rgba(6,214,160,0.6)' : 'none',
                  }}
                />
                <span className="font-semibold text-sm truncate" style={{ color: 'var(--bp-text)' }}>
                  {t.name || `단말기 ${t.term_id}`}
                </span>
              </div>
              {t.corner && (
                <p className="text-xs truncate mb-1" style={{ color: 'var(--bp-text-3)' }}>{t.corner}</p>
              )}
              <p className="text-xs tabular-nums" style={{ color: 'var(--bp-text-3)' }}>
                {t.last_seen_at
                  ? new Date(t.last_seen_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                  : '미접속'}
              </p>
            </div>
          ))}
          {!terminals.length && (
            <p className="col-span-4 text-sm py-6 text-center" style={{ color: 'var(--bp-text-3)' }}>
              등록된 단말기가 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 최근 거래내역 */}
      <div className="bp-card rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: 'var(--bp-text-3)' }}>최근 거래내역</h2>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bp-border)' }}>
              <th className="text-left pb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--bp-text-3)' }}>메뉴</th>
              <th className="text-right pb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--bp-text-3)' }}>금액</th>
              <th className="text-center pb-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell"
                  style={{ color: 'var(--bp-text-3)' }}>결제</th>
              <th className="text-center pb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--bp-text-3)' }}>상태</th>
              <th className="text-right pb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--bp-text-3)' }}>시간</th>
            </tr>
          </thead>
          <tbody>
            {recentTxs.map(tx => (
              <tr key={tx.id} className="hover:bg-white/[0.03] transition-colors"
                  style={{ borderBottom: '1px solid var(--bp-border-2)' }}>
                <td className="py-3 pr-4 font-medium" style={{ color: 'var(--bp-text)' }}>
                  {tx.menu_name}
                </td>
                <td className="py-3 text-right font-bold tabular-nums" style={{ color: 'var(--bp-text)' }}>
                  ₩{tx.amount.toLocaleString()}
                </td>
                <td className="py-3 text-center hidden sm:table-cell" style={{ color: 'var(--bp-text-2)' }}>
                  {tx.payment_type}
                </td>
                <td className="py-3 text-center">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                    style={tx.status === 'success'
                      ? { background: 'rgba(6,214,160,0.12)', color: '#06D6A0' }
                      : { background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                  >
                    {tx.status === 'success' ? '승인' : '취소'}
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums text-xs" style={{ color: 'var(--bp-text-3)' }}>
                  {new Date(tx.approved_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
            {!recentTxs.length && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm" style={{ color: 'var(--bp-text-3)' }}>
                  거래내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type SummaryCardProps = {
  label: string
  value: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

function SummaryCard({ label, value, icon: Icon, iconColor, iconBg }: SummaryCardProps) {
  return (
    <div className="bp-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--bp-text-3)' }}>
          {label}
        </span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: iconBg, color: iconColor }}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--bp-text)' }}>
        {value}
      </p>
    </div>
  )
}
