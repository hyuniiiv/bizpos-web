'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { MenuSummary } from '@/lib/analytics/queries'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

interface Props {
  data: MenuSummary[]
}

export default function MenuPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/40 text-sm">
        선택 기간에 거래 내역이 없습니다.
      </div>
    )
  }

  const chartData = data.slice(0, 8).map((d) => ({
    name: d.menu_name,
    value: d.total_amount,
  }))

  return (
    <div className="flex gap-6 items-start">
      <div className="w-48 h-48 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `₩${Number(value).toLocaleString()}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 순위 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/50 text-xs border-b border-white/10">
              <th className="text-left pb-2">순위</th>
              <th className="text-left pb-2">메뉴</th>
              <th className="text-right pb-2">매출액</th>
              <th className="text-right pb-2">건수</th>
              <th className="text-right pb-2">비율</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.menu_name} className="border-b border-white/5 last:border-0">
                <td className="py-1.5 pr-2">
                  <span
                    className="flex w-5 h-5 rounded-full text-white text-xs items-center justify-center"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="py-1.5 pr-2 font-medium text-white/80">{d.menu_name}</td>
                <td className="py-1.5 text-right text-white/80">₩{d.total_amount.toLocaleString()}</td>
                <td className="py-1.5 text-right text-white/50">{d.count}건</td>
                <td className="py-1.5 text-right text-white/50">{(d.ratio * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
