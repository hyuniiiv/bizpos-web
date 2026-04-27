import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Merchant, Store } from '@/lib/context/MerchantStoreContext'
import MerchantDetailClient from './MerchantDetailClient'

interface Admin {
  id: string
  email: string
}

interface Manager {
  id: string
  email: string
}

async function getMerchant(id: string): Promise<Merchant | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/merchants/${id}`,
      {
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.data || null
  } catch {
    return null
  }
}

async function getAdmins(): Promise<Admin[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/admins`,
      {
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

async function getManagers(): Promise<Manager[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/managers`,
      {
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

async function getStores(merchantId: string): Promise<Store[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/stores?merchant_id=${merchantId}`,
      {
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [merchant, admins, managers, stores] = await Promise.all([
    getMerchant(id),
    getAdmins(),
    getManagers(),
    getStores(id),
  ])

  if (!merchant) {
    notFound()
  }

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user?.id || '')
    .single()

  const canEdit = membership?.role === 'platform_admin' || membership?.role === 'merchant_admin'
  const canDelete = membership?.role === 'platform_admin'

  return (
    <MerchantDetailClient
      merchant={merchant}
      admins={admins}
      managers={managers}
      stores={stores}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
}
