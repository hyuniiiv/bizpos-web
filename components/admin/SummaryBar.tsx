interface SummaryBarProps {
  totalCount: number
  totalAmount: number
}

export function SummaryBar({ totalCount, totalAmount }: SummaryBarProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="glass-card rounded-xl p-5">
        <p className="text-base text-white/60 mb-1">총 거래건수</p>
        <p className="text-4xl font-black text-white">{totalCount.toLocaleString()}건</p>
      </div>
      <div className="glass-card rounded-xl p-5">
        <p className="text-base text-white/60 mb-1">총 매출액</p>
        <p className="text-4xl font-black text-white">{totalAmount.toLocaleString()}원</p>
      </div>
    </div>
  )
}
