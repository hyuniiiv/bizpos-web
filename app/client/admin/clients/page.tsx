import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientsClient from './ClientsClient'

export const revalidate = 0

export type ClientRow = {
  id: string
  client_name: string
  biz_no: string
  is_active: boolean
  created_at: string
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('client_users')
    .select('client_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')

  const isPlatformAdmin = membership.role === 'platform_client_admin'

  let q = supabase
    .from('clients')
    .select('id, client_name, biz_no, is_active, created_at')
    .order('client_name')

  if (!isPlatformAdmin) {
    q = q.eq('id', membership.client_id)
  }

  const { data: clients } = await q

  return (
    <ClientsClient
      clients={(clients ?? []) as ClientRow[]}
      isPlatformAdmin={isPlatformAdmin}
    />
  )
}
