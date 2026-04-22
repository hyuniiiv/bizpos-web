import type { Transaction } from '@/types/payment'
import { formatDateTime } from '@/lib/utils'

interface RealtimeTableProps {
  transactions: Transaction[]
  newIds: Set<string>
  totalCount: number
  totalAmount: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

export function RealtimeTable({
  transactions, newIds, totalCount, totalAmount,
  page = 1, pageSize = 20, onPageChange,
}: RealtimeTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const pageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <tr>
              <th className="px-4 py-4 text-left text-sm font-semibold text-white/50">결제시간</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-white/50">사용자명</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-white/50">과정명(메뉴)</th>
              <th className="px-4 py-4 text-right text-sm font-semibold text-white/50">금액</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-white/50">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-white/40">
                  거래 내역이 없습니다
                </td>
              </tr>
            ) : (
              transactions.map(tx => (
                <tr
                  key={tx.id}
                  className={`transition-colors duration-500 ${
                    newIds.has(tx.id) ? 'bg-green-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <td className="px-4 py-4 text-white/60 font-mono text-base">
                    {formatDateTime(tx.approvedAt)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-white">
                    {tx.userName || '-'}
                  </td>
                  <td className="px-4 py-4 text-white/80">{tx.menuName}</td>
                  <td className={`px-4 py-4 text-right font-semibold ${tx.amount < 0 ? 'text-red-400' : 'text-white'}`}>
                    {tx.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        <span className="text-base text-white/50">
          총 {totalCount}건 / 합계 {totalAmount.toLocaleString()}원
        </span>
        {onPageChange && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-2 text-base rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              ← 이전
            </button>
            {pageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-base text-white/40">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={`w-10 h-10 text-base rounded transition-colors ${
                    p === page
                      ? 'bg-blue-500/40 text-white border border-blue-400/50'
                      : 'text-white/60 hover:bg-white/10 border border-white/15'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-2 text-base rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              다음 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: '✅ 정상', cls: 'text-green-300 bg-green-500/20' },
    cancelled: { label: '❌ 취소', cls: 'text-red-300 bg-red-500/20' },
    failed: { label: '❌ 실패', cls: 'text-red-300 bg-red-500/20' },
    pending_offline: { label: '⏳ 오프라인', cls: 'text-orange-300 bg-orange-500/20' },
  }
  const s = map[status] ?? { label: status, cls: 'text-white/60 bg-white/10' }
  return (
    <span className={`px-3 py-1 rounded-full text-base font-semibold ${s.cls}`}>{s.label}</span>
  )
}
