import { createClient } from '@/lib/supabase/server'
import {
  getMenuSummary,
  getDailySummary,
  getTerminalSummary,
  getTerminalTypeSummary,
  getAnalyticsSummary,
} from '@/lib/analytics/queries'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'
import { redirect } from 'next/navigation'

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

  if (preset === 'month') {
    return { from: `${todayStr.slice(0, 7)}-01`, to: todayStr }
  }

  return { from: todayStr, to: todayStr }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; merchantId?: string; storeId?: string }>
}) {
  const params = await searchParams
  const preset = (params.preset ?? 'today') as Preset
  const { from, to } = getDateRange(preset, params.from, params.to)
  const fromISO = `${from}T00:00:00Z`
  const toISO = `${to}T23:59:59Z`
  const storeId = params.storeId ?? ''

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

  // 접근 가능한 가맹점 목록
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

  // 선택된 가맹점 (URL param 없으면 첫 번째)
  const selectedMerchantId = (params.merchantId && merchants.some(m => m.id === params.merchantId))
    ? params.merchantId
    : merchants[0]?.id ?? ''

  // 해당 가맹점 매장 목록
  const { data: stores } = selectedMerchantId
    ? await supabase.from('stores').select('id, store_name').eq('merchant_id', selectedMerchantId).order('store_name')
    : { data: [] }

  // 분석 데이터 병렬 조회
  const [summary, menuData, dailyData, terminalData, terminalTypeData] = await Promise.all([
    getAnalyticsSummary(supabase, selectedMerchantId, fromISO, toISO, storeId || undefined),
    getMenuSummary(supabase, selectedMerchantId, fromISO, toISO, storeId || undefined),
    getDailySummary(supabase, selectedMerchantId, fromISO, toISO, storeId || undefined),
    getTerminalSummary(supabase, selectedMerchantId, fromISO, toISO, storeId || undefined),
    getTerminalTypeSummary(supabase, selectedMerchantId, fromISO, toISO, storeId || undefined),
  ])

  return (
    <AnalyticsClient
      preset={preset}
      from={from}
      to={to}
      summary={summary}
      menuData={menuData}
      dailyData={dailyData}
      terminalData={terminalData}
      terminalTypeData={terminalTypeData}
      merchants={merchants}
      stores={(stores ?? []) as { id: string; store_name: string }[]}
      selectedMerchantId={selectedMerchantId}
      selectedStoreId={storeId}
    />
  )
}
