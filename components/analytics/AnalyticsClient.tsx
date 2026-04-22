'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import SummaryCards from './SummaryCards'
import DateRangeFilter from './DateRangeFilter'
import type { MenuSummary, DailySummary, TerminalSummary, AnalyticsSummary } from '@/lib/analytics/queries'

// SSR 비활성화 (recharts window 의존성)
const MenuPieChart = dynamic(() => import('./MenuPieChart'), { ssr: false })
const DailyLineChart = dynamic(() => import('./DailyLineChart'), { ssr: false })
const TerminalBarChart = dynamic(() => import('./TerminalBarChart'), { ssr: false })

type Preset = 'today' | 'week' | 'month' | 'custom'

interface Props {
  preset: Preset
  from: string
  to: string
  summary: AnalyticsSummary
  menuData: MenuSummary[]
  dailyData: DailySummary[]
  terminalData: TerminalSummary[]
}

export default function AnalyticsClient({
  preset,
  from,
  to,
  summary,
  menuData,
  dailyData,
  terminalData,
}: Props) {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">매출 분석</h1>
        <Suspense fallback={null}>
          <DateRangeFilter preset={preset} from={from} to={to} />
        </Suspense>
      </div>

      {/* 요약 카드 */}
      <SummaryCards summary={summary} />

      {/* 메뉴별 매출 */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">메뉴별 매출</h2>
        <MenuPieChart data={menuData} />
      </div>

      {/* 기간별 매출 추세 */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">기간별 매출 추세</h2>
        <DailyLineChart data={dailyData} />
      </div>

      {/* 단말기별 매출 */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">단말기별 매출</h2>
        <TerminalBarChart data={terminalData} />
      </div>
    </div>
  )
}
