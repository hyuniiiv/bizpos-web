import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MerchantsClient from './MerchantsClient'
import type { Merchant } from '@/lib/context/MerchantStoreContext'

interface Admin {
  id: string
  email: string
}

interface Manager {
  id: string
  email: string
}

async function getMerchants(supabase: any): Promise<Merchant[]> {
  try {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('*')
      .order('name')
    return merchants || []
  } catch {
    return []
  }
}

async function getAdmins(supabase: any): Promise<Admin[]> {
  try {
    const { data: adminUsers } = await supabase
      .from('merchant_users')
      .select('user_id')
      .eq('role', 'admin')

    if (!adminUsers || adminUsers.length === 0) return []

    const userIds = adminUsers.map((a: any) => a.user_id)
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error || !users) return []

    return users.users
      .filter((u: any) => userIds.includes(u.id))
      .map((u: any) => ({
        id: u.id,
        email: u.email || '',
      }))
  } catch {
    return []
  }
}

async function getManagers(supabase: any): Promise<Manager[]> {
  try {
    const { data: managerUsers } = await supabase
      .from('merchant_users')
      .select('user_id')
      .eq('role', 'manager')

    if (!managerUsers || managerUsers.length === 0) return []

    const userIds = managerUsers.map((m: any) => m.user_id)
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error || !users) return []

    return users.users
      .filter((u: any) => userIds.includes(u.id))
      .map((u: any) => ({
        id: u.id,
        email: u.email || '',
      }))
  } catch {
    return []
  }
}

export default async function MerchantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('merchant_id, role')
    .eq('user_id', user.id)
    .single()

  const [merchants, admins, managers] = await Promise.all([
    getMerchants(supabase),
    getAdmins(supabase),
    getManagers(supabase),
  ])

  return (
    <MerchantsClient
      merchants={merchants}
      admins={admins}
      managers={managers}
      userRole={membership?.role || null}
      userMerchantId={membership?.merchant_id || null}
    />
  )
}
