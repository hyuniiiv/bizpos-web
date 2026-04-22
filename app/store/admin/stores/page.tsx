import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoresClient from './StoresClient'

export const revalidate = 0

export type Merchant = {
  id: string
  name: string
  biz_no: string | null
  merchant_id: string | null
  contact_email: string | null
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

  const isPlatformAdmin = membership.role === 'platform_store_admin'

  let q = supabase
    .from('merchants')
    .select('id, name, biz_no, merchant_id, contact_email, created_at')
    .order('name')

  if (!isPlatformAdmin) {
    q = q.eq('id', membership.merchant_id)
  }

  const { data: merchants } = await q

  return (
    <StoresClient
      merchants={(merchants ?? []) as Merchant[]}
      isPlatformAdmin={isPlatformAdmin}
    />
  )
}
