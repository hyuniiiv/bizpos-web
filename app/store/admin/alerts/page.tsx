import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AlertsClient from './AlertsClient'

export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ show?: string }>
}

export default async function AlertsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/setup')

  const params = await searchParams
  const showAll = params?.show === 'all'

  const query = supabase
    .from('anomaly_alerts')
    .select('*, terminals(name, term_id)')
    .eq('merchant_id', membership.merchant_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!showAll) {
    query.eq('resolved', false)
  }

  const { data: alerts } = await query

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">이상 알림</h1>
        <p className="text-sm text-white/50 mt-1">이상 거래 감지 알림을 확인하고 처리하세요.</p>
      </div>
      <AlertsClient alerts={alerts ?? []} showAll={showAll} />
    </div>
  )
}
