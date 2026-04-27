'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { TerminalTypeSummary } from '@/lib/analytics/queries'

const TYPE_COLORS: Record<string, string> = {
  ticket_checker: '#3b82f6',
  pos: '#10b981',
  kiosk: '#a78bfa',
  table_order: '#f59e0b',
}

interface Props {
  data: TerminalTypeSummary[]
}

export default function TerminalTypeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/40 text-sm">
        선택 기간에 거래 내역이 없습니다.
      </div>
    )
  }

  const chartData = data.map(d => ({ name: d.label, type: d.terminal_type, amount: d.total_amount, count: d.count }))

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v.toLocaleString()}
            tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [
              name === 'amount' ? `₩${Number(value).toLocaleString()}` : `${value}건`,
              name === 'amount' ? '매출' : '건수',
            ]}
            contentStyle={{ background: 'rgba(15,27,76,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
            labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={TYPE_COLORS[entry.type] ?? '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.map(d => (
          <div key={d.terminal_type} className="rounded-lg p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${TYPE_COLORS[d.terminal_type] ?? '#6b7280'}30` }}>
            <div className="text-xs text-white/50 mb-1">{d.label}</div>
            <div className="text-base font-bold text-white">₩{d.total_amount.toLocaleString()}</div>
            <div className="text-xs text-white/40">{d.count}건</div>
          </div>
        ))}
      </div>
    </div>
  )
}
