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

async function getMerchants(): Promise<Merchant[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/merchants`, {
      next: { revalidate: 0 },
      credentials: 'include',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

async function getAdmins(): Promise<Admin[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/admins`, {
      next: { revalidate: 0 },
      credentials: 'include',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

async function getManagers(): Promise<Manager[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/managers`, {
      next: { revalidate: 0 },
      credentials: 'include',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
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
    getMerchants(),
    getAdmins(),
    getManagers(),
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
