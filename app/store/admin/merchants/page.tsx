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
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

async function getCurrentUser(): Promise<{ role: string | null; merchantId: string | null }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/me`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return { role: null, merchantId: null }
    const json = await res.json()
    return {
      role: json.data?.role || null,
      merchantId: json.data?.merchant_id || null,
    }
  } catch {
    return { role: null, merchantId: null }
  }
}

export default async function MerchantsPage() {
  const [merchants, admins, managers, user] = await Promise.all([
    getMerchants(),
    getAdmins(),
    getManagers(),
    getCurrentUser(),
  ])

  return (
    <MerchantsClient
      merchants={merchants}
      admins={admins}
      managers={managers}
      userRole={user.role}
      userMerchantId={user.merchantId}
    />
  )
}
