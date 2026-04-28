import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import StoresClient from './StoresClient'

export const revalidate = 0

export type Store = {
  id: string
  store_name: string
  address: string | null
  is_active: boolean
  merchant_id: string
  created_at: string
}

export default async function StoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isTerminalAdmin = user.app_metadata?.role === 'terminal_admin'

  const adminDb = createAdminClient()
  const { data: membership } = isTerminalAdmin
    ? { data: null }
    : await adminDb
        .from('merchant_users')
        .select('merchant_id, role')
        .eq('user_id', user.id)
        .single()

  if (!isTerminalAdmin && !membership) redirect('/login')

  const role = isTerminalAdmin ? 'terminal_admin' : membership!.role
  const isGlobalViewer = role === 'platform_admin' || role === 'terminal_admin'

  let q = adminDb
    .from('stores')
    .select('id, store_name, address, is_active, merchant_id, created_at')
    .order('created_at', { ascending: true })

  if (!isGlobalViewer) {
    q = q.eq('merchant_id', membership!.merchant_id)
  }

  const { data: stores } = await q

  // 매장별 단말기 수 표시용
  const storeIds = (stores ?? []).map((s: any) => s.id)
  const { data: terminals } = storeIds.length > 0
    ? await adminDb
        .from('terminals')
        .select('id, store_id, term_id, name, status')
        .in('store_id', storeIds)
    : { data: [] }

  return (
    <StoresClient
      stores={(stores ?? []) as Store[]}
      myRole={role}
      merchantId={membership?.merchant_id ?? ''}
      merchantName={undefined}
      terminals={terminals ?? []}
    />
  )
}
