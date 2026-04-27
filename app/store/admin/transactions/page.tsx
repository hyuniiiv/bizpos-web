import { createClient } from '@/lib/supabase/server'
import { CancelButton } from './CancelButton'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import MerchantStoreFilter from '@/components/analytics/MerchantStoreFilter'
import DateRangeFilter from '@/components/analytics/DateRangeFilter'

export const revalidate = 0

type Preset = 'today' | 'week' | 'month' | 'custom'

function getDateRange(preset: Preset, from?: string, to?: string): { from: string; to: string } {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  if (preset === 'custom' && from && to) return { from, to }
  if (preset === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    return { from: monday.toISOString().slice(0, 10), to: todayStr }
  }
  if (preset === 'month') return { from: `${todayStr.slice(0, 7)}-01`, to: todayStr }
  return { from: todayStr, to: todayStr }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; terminal?: string; merchantId?: string; storeId?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 사용자 merchant_users (role 포함)
  const { data: myMerchantUsers } = await supabase
    .from('merchant_users')
    .select('merchant_id, role, merchants(id, name)')
    .eq('user_id', user.id)

  const hasFullAccess = myMerchantUsers?.some(mu =>
    mu.role === 'platform_admin' || mu.role === 'terminal_admin'
  ) ?? false

  let merchants: { id: string; name: string }[] = []
  if (hasFullAccess) {
    const { data: all } = await supabase.from('merchants').select('id, name').order('name')
    merchants = (all ?? []).map(m => ({ id: m.id, name: m.name ?? '' }))
  } else {
    merchants = (myMerchantUsers ?? [])
      .map(mu => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (mu as any).merchants
        const m = Array.isArray(raw) ? raw[0] : raw
        return m ? { id: m.id as string, name: (m.name ?? '') as string } : null
      })
      .filter(Boolean) as { id: string; name: string }[]
  }

  const selectedMerchantId = (params.merchantId && merchants.some(m => m.id === params.merchantId))
    ? params.merchantId
    : merchants[0]?.id ?? ''

  const { data: stores } = selectedMerchantId
    ? await supabase.from('stores').select('id, store_name').eq('merchant_id', selectedMerchantId).order('store_name')
    : { data: [] }

  const storeId = params.storeId ?? ''
  const preset = (params.preset ?? 'today') as Preset
  const { from, to } = getDateRange(preset, params.from, params.to)

  let query = supabase
    .from('transactions')
    .select(`
      id, tid, merchant_order_id, menu_name, amount, barcode_info, payment_type, status, approved_at, synced,
      terminals(name, term_id)
    `)
    .eq('merchant_id', selectedMerchantId)
    .gte('approved_at', `${from}T00:00:00Z`)
    .lte('approved_at', `${to}T23:59:59Z`)
    .order('approved_at', { ascending: false })
    .limit(500)

  if (params.terminal) {
    query = query.eq('terminal_id', params.terminal)
  } else if (storeId) {
    const { data: storeTerminals } = await supabase
      .from('terminals').select('id').eq('store_id', storeId)
    const terminalIds = (storeTerminals ?? []).map(t => t.id)
    if (terminalIds.length > 0) query = query.in('terminal_id', terminalIds)
  }

  const { data: transactions } = await query
  const successTxs = transactions?.filter(t => t.status === 'success') ?? []
  const totalAmount = successTxs.reduce((s, t) => s + t.amount, 0)

  const selectedStore = (stores ?? []).find(s => s.id === storeId)
  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">거래내역</h1>
            {(selectedMerchant || selectedStore) && (
              <p className="text-sm text-white/40 mt-0.5">
                {selectedMerchant?.name}{selectedStore ? ` › ${selectedStore.store_name}` : ''}
              </p>
            )}
          </div>
          <Suspense fallback={null}>
            <DateRangeFilter
              preset={preset}
              from={from}
              to={to}
              basePath="/store/admin/transactions"
            />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <MerchantStoreFilter
            merchants={merchants}
            stores={(stores ?? []) as { id: string; store_name: string }[]}
            selectedMerchantId={selectedMerchantId}
            selectedStoreId={storeId}
            basePath="/store/admin/transactions"
          />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' }}>
          <p className="text-xs text-blue-300/70 mb-1">총 매출</p>
          <p className="text-2xl font-bold text-blue-200">₩{totalAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.22)' }}>
          <p className="text-xs text-green-300/70 mb-1">승인건수</p>
          <p className="text-2xl font-bold text-green-200">{successTxs.length}건</p>
        </div>
        <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
          <p className="text-xs text-purple-300/70 mb-1">건당 평균</p>
          <p className="text-2xl font-bold text-purple-200">
            ₩{successTxs.length > 0 ? Math.round(totalAmount / successTxs.length).toLocaleString() : 0}
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-white/50">일시</th>
              <th className="text-left px-4 py-3 text-white/50">단말기</th>
              <th className="text-left px-4 py-3 text-white/50">메뉴</th>
              <th className="text-right px-4 py-3 text-white/50">금액</th>
              <th className="text-center px-4 py-3 text-white/50">결제방식</th>
              <th className="text-left px-4 py-3 text-white/50">바코드/QR</th>
              <th className="text-center px-4 py-3 text-white/50">상태</th>
              <th className="text-center px-4 py-3 text-white/50">관리</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map(tx => (
              <tr key={tx.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 text-white/60 whitespace-nowrap">
                  {new Date(tx.approved_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
                    tx.status === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {tx.status === 'success' ? '승인' : '취소'}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  {tx.status === 'success' && tx.merchant_order_id && tx.tid && (
                    <CancelButton
                      merchantOrderID={tx.merchant_order_id}
                      tid={tx.tid}
                      amount={tx.amount}
                      menuName={tx.menu_name}
                      termId={(tx.terminals as unknown as { term_id: string } | null)?.term_id ?? ''}
                    />
                  )}
                </td>
              </tr>
            ))}
            {!transactions?.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                  {from === to ? from : `${from} ~ ${to}`} 거래내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
