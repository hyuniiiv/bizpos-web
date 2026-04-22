import { createClient } from '@/lib/supabase/server'
import SetupMerchant from './SetupMerchant'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 가맹점 조회
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id, merchants(id, name)')
    .eq('user_id', user.id)
    .single()

  // 가맹점 미등록 시 초기화 안내
  if (!merchantUser) return <SetupMerchant />

  const merchantId = merchantUser?.merchant_id

  // 단말기 목록
  const { data: terminals } = await supabase
    .from('terminals')
    .select('id, name, term_id, corner, status, last_seen_at')
    .eq('merchant_id', merchantId)
    .order('term_id')

  // 오늘 거래내역 집계
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayTxs } = await supabase
    .from('transactions')
    .select('amount, status')
    .eq('merchant_id', merchantId)
    .gte('approved_at', `${today}T00:00:00Z`)
    .eq('status', 'success')

  const todayAmount = todayTxs?.reduce((s, t) => s + t.amount, 0) ?? 0
  const todayCount = todayTxs?.length ?? 0

  // 최근 거래 10건
  const { data: recentTxs } = await supabase
    .from('transactions')
    .select('id, menu_name, amount, payment_type, status, approved_at')
    .eq('merchant_id', merchantId)
    .order('approved_at', { ascending: false })
    .limit(10)

  return (
    <DashboardClient
      merchantId={merchantId}
      initialTerminals={terminals ?? []}
      initialRecentTxs={recentTxs ?? []}
      initialTodayAmount={todayAmount}
      initialTodayCount={todayCount}
    />
  )
}
