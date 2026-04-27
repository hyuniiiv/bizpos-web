'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import SummaryCards from './SummaryCards'
import DateRangeFilter from './DateRangeFilter'
import MerchantStoreFilter from './MerchantStoreFilter'
import type { MerchantOption, StoreOption } from './MerchantStoreFilter'
import type { MenuSummary, DailySummary, TerminalSummary, TerminalTypeSummary, AnalyticsSummary } from '@/lib/analytics/queries'

// SSR 비활성화 (recharts window 의존성)
const MenuPieChart = dynamic(() => import('./MenuPieChart'), { ssr: false })
const DailyLineChart = dynamic(() => import('./DailyLineChart'), { ssr: false })
const TerminalBarChart = dynamic(() => import('./TerminalBarChart'), { ssr: false })
const TerminalTypeChart = dynamic(() => import('./TerminalTypeChart'), { ssr: false })

type Preset = 'today' | 'week' | 'month' | 'custom'

interface Props {
  preset: Preset
  from: string
  to: string
  summary: AnalyticsSummary
  menuData: MenuSummary[]
  dailyData: DailySummary[]
  terminalData: TerminalSummary[]
  terminalTypeData: TerminalTypeSummary[]
  merchants: MerchantOption[]
  stores: StoreOption[]
  selectedMerchantId: string
  selectedStoreId: string
}

export default function AnalyticsClient({
  preset, from, to,
  summary, menuData, dailyData, terminalData, terminalTypeData,
  merchants, stores, selectedMerchantId, selectedStoreId,
}: Props) {
  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId)
  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">매출 분석</h1>
            {(selectedMerchant || selectedStore) && (
              <p className="text-sm text-white/40 mt-0.5">
                {selectedMerchant?.name}{selectedStore ? ` › ${selectedStore.store_name}` : ''}
              </p>
            )}
          </div>
          <Suspense fallback={null}>
            <DateRangeFilter preset={preset} from={from} to={to} />
          </Suspense>
        </div>

        {/* 가맹점 / 매장 필터 */}
        <Suspense fallback={null}>
          <MerchantStoreFilter
            merchants={merchants}
            stores={stores}
            selectedMerchantId={selectedMerchantId}
            selectedStoreId={selectedStoreId}
          />
        </Suspense>
      </div>

      {/* 요약 카드 */}
      <SummaryCards summary={summary} />

      {/* 단말기 유형별 매출 */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-1">단말기 유형별 매출</h2>
        <p className="text-xs text-white/40 mb-4">식권체크기 · POS · 키오스크 · 테이블오더</p>
        <TerminalTypeChart data={terminalTypeData} />
      </div>

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
