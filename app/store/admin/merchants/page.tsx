import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

async function getMerchants(): Promise<Merchant[]> {
  try {
    const admin = createAdminClient()
    const { data: merchants } = await admin
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
      .eq('role', 'merchant_admin')

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


export default async function MerchantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isTerminalAdmin = user.app_metadata?.role === 'terminal_admin'

  const admin = createAdminClient()
  const { data: membership } = isTerminalAdmin ? { data: null } : await admin
    .from('merchant_users')
    .select('merchant_id, role')
    .eq('user_id', user.id)
    .single()

  const userRole = isTerminalAdmin ? 'terminal_admin' : (membership?.role || null)

  const [merchants, admins] = await Promise.all([
    getMerchants(),
    getAdmins(supabase),
  ])

  return (
    <MerchantsClient
      merchants={merchants}
      admins={admins}
      userRole={userRole}
      userMerchantId={membership?.merchant_id || null}
    />
  )
}
