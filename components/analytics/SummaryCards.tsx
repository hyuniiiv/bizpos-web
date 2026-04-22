import type { AnalyticsSummary } from '@/lib/analytics/queries'

export default function SummaryCards({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' }}>
        <p className="text-xs text-blue-300/70 mb-1">총 매출</p>
        <p className="text-2xl font-bold text-blue-200">₩{summary.totalAmount.toLocaleString()}</p>
      </div>
      <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.22)' }}>
        <p className="text-xs text-green-300/70 mb-1">승인건수</p>
        <p className="text-2xl font-bold text-green-200">{summary.totalCount}건</p>
      </div>
      <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
        <p className="text-xs text-purple-300/70 mb-1">건당 평균</p>
        <p className="text-2xl font-bold text-purple-200">₩{summary.avgAmount.toLocaleString()}</p>
      </div>
    </div>
  )
}
