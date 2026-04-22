import { createClient } from '@/lib/supabase/server'
import {
  getMenuSummary,
  getDailySummary,
  getTerminalSummary,
  getAnalyticsSummary,
} from '@/lib/analytics/queries'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'
import { redirect } from 'next/navigation'

export const revalidate = 0

type Preset = 'today' | 'week' | 'month' | 'custom'

function getDateRange(preset: Preset, from?: string, to?: string): { from: string; to: string } {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  if (preset === 'custom' && from && to) {
    return { from, to }
  }

  if (preset === 'week') {
    const day = now.getDay() // 0=Sun
    const diff = day === 0 ? 6 : day - 1  // Monday = 0
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    return { from: monday.toISOString().slice(0, 10), to: todayStr }
  }

  if (preset === 'month') {
    const firstDay = `${todayStr.slice(0, 7)}-01`
    return { from: firstDay, to: todayStr }
  }

  // today (default)
  return { from: todayStr, to: todayStr }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const preset = (params.preset ?? 'today') as Preset
  const { from, to } = getDateRange(preset, params.from, params.to)

  const fromISO = `${from}T00:00:00Z`
  const toISO = `${to}T23:59:59Z`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  const merchantId = merchantUser?.merchant_id ?? ''

  const [summary, menuData, dailyData, terminalData] = await Promise.all([
    getAnalyticsSummary(supabase, merchantId, fromISO, toISO),
    getMenuSummary(supabase, merchantId, fromISO, toISO),
    getDailySummary(supabase, merchantId, fromISO, toISO),
    getTerminalSummary(supabase, merchantId, fromISO, toISO),
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
    />
  )
}
