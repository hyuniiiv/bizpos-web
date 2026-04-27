import { createClient } from '@/lib/supabase/server'
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

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('merchant_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')

  const isPlatformAdmin = membership.role === 'platform_admin'

  let q = supabase
    .from('stores')
    .select('id, store_name, address, is_active, merchant_id, created_at')
    .order('created_at', { ascending: true })

  if (!isPlatformAdmin) {
    q = q.eq('merchant_id', membership.merchant_id)
  }

  const { data: stores } = await q

  const { data: merchant } = membership.merchant_id
    ? await supabase.from('merchants').select('name').eq('id', membership.merchant_id).single()
    : { data: null }

  return (
    <StoresClient
      stores={(stores ?? []) as Store[]}
      myRole={membership.role}
      merchantId={membership.merchant_id}
      merchantName={merchant?.name ?? undefined}
    />
  )
}
