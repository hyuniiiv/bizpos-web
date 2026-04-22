import { createClient } from '@/lib/supabase/server'
import { DateFilter } from './DateFilter'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; terminal?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  const merchantId = merchantUser?.merchant_id
  const today = new Date().toISOString().slice(0, 10)
  const selectedDate = params.date ?? today

  let query = supabase
    .from('transactions')
    .select(`
      id, menu_name, amount, barcode_info, payment_type, status, approved_at, synced,
      terminals(name, term_id)
    `)
    .eq('merchant_id', merchantId)
    .gte('approved_at', `${selectedDate}T00:00:00Z`)
    .lte('approved_at', `${selectedDate}T23:59:59Z`)
    .order('approved_at', { ascending: false })
    .limit(200)

  if (params.terminal) {
    query = query.eq('terminal_id', params.terminal)
  }

  const { data: transactions } = await query

  const successTxs = transactions?.filter(t => t.status === 'success') ?? []
  const totalAmount = successTxs.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">거래내역</h1>
        <DateFilter value={selectedDate} />
      </div>

      <div className="flex gap-4">
        <div className="glass-card rounded-xl px-5 py-3 text-blue-300"
             style={{ background: 'rgba(96,165,250,0.12)' }}>
          <p className="text-xs opacity-70">총 매출</p>
          <p className="text-xl font-bold">₩{totalAmount.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-xl px-5 py-3 text-green-300"
             style={{ background: 'rgba(74,222,128,0.12)' }}>
          <p className="text-xs opacity-70">승인건수</p>
          <p className="text-xl font-bold">{successTxs.length}건</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-white/50">시간</th>
              <th className="text-left px-4 py-3 text-white/50">단말기</th>
              <th className="text-left px-4 py-3 text-white/50">메뉴</th>
              <th className="text-right px-4 py-3 text-white/50">금액</th>
              <th className="text-center px-4 py-3 text-white/50">결제방식</th>
              <th className="text-left px-4 py-3 text-white/50">바코드/QR</th>
              <th className="text-center px-4 py-3 text-white/50">상태</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map(tx => (
              <tr key={tx.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 text-white/60 whitespace-nowrap">
                  {new Date(tx.approved_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="px-4 py-2 text-xs text-white/50">
                  {(tx.terminals as unknown as { name: string; term_id: string } | null)?.name || (tx.terminals as unknown as { name: string; term_id: string } | null)?.term_id}
                </td>
                <td className="px-4 py-2 text-white">{tx.menu_name}</td>
                <td className="px-4 py-2 text-right font-medium text-white">₩{tx.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-center text-white/50">{tx.payment_type}</td>
                <td className="px-4 py-2 font-mono text-xs text-white/50 max-w-[200px] truncate">
                  {tx.barcode_info || '-'}
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    tx.status === 'success'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {tx.status === 'success' ? '승인' : '취소'}
                  </span>
                </td>
              </tr>
            ))}
            {!transactions?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  {selectedDate} 거래내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
