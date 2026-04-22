import { useState } from 'react'
import type { Transaction } from '@/types/payment'
import { formatDateTime } from '@/lib/utils'

interface TransactionRowProps {
  tx: Transaction
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onCancel: (tx: Transaction) => void
}

export function TransactionRow({ tx, selected, onSelect, onCancel }: TransactionRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr className={`cursor-pointer transition-colors ${selected ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}
          onClick={() => setExpanded(v => !v)}>
        <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={e => onSelect(tx.id, e.target.checked)}
            className="rounded"
            disabled={tx.status !== 'success'}
          />
        </td>
        <td className="px-4 py-4 text-white/60 font-mono text-sm">
          {formatDateTime(tx.approvedAt)}
        </td>
        <td className="px-4 py-4 font-medium text-white">{tx.userName || '-'}</td>
        <td className="px-4 py-4 text-white/80">{tx.menuName}</td>
        <td className={`px-4 py-4 text-right font-semibold ${tx.amount < 0 ? 'text-red-400' : 'text-white'}`}>
          {tx.amount.toLocaleString()}
        </td>
        <td className="px-4 py-4 text-center text-sm text-white/60">
          {tx.paymentType === 'qr' ? 'QR' : tx.paymentType === 'rfcard' ? 'RF카드' : '바코드'}
        </td>
        <td className="px-4 py-4 text-center">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            tx.status === 'success' ? 'bg-green-500/20 text-green-300' :
            tx.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
            'bg-orange-500/20 text-orange-300'
          }`}>
            {tx.status === 'success' ? '정상' : tx.status === 'cancelled' ? '취소' : '오프라인'}
          </span>
        </td>
        <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-white/30 text-sm select-none">{expanded ? '▲' : '▼'}</span>
            {tx.status === 'success' && (
              <button onClick={() => onCancel(tx)} className="text-red-400 text-sm hover:text-red-300 transition-colors">
                취소
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
          <td colSpan={8} className="px-6 py-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/40 shrink-0">
                {tx.paymentType === 'qr' ? '📷 QR코드' : '🔖 바코드'}
              </span>
              <span className="font-mono text-white/70 break-all select-all">
                {tx.barcodeInfo || '-'}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
