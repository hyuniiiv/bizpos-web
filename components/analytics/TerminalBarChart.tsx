'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TerminalSummary } from '@/lib/analytics/queries'

interface Props {
  data: TerminalSummary[]
}

export default function TerminalBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/40 text-sm">
        선택 기간에 거래 내역이 없습니다.
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.terminal_name || d.term_id,
    amount: d.total_amount,
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={false} />
        <YAxis
          tickFormatter={(v: number) =>
            v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v.toLocaleString()
          }
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
        />
        <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
