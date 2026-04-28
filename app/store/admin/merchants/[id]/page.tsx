import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Merchant, Store } from '@/lib/context/MerchantStoreContext'
import MerchantDetailClient from './MerchantDetailClient'

interface AvailableUser {
  id: string
  email: string
}

async function getMerchant(supabase: any, id: string): Promise<Merchant | null> {
  try {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .single()
    return merchant || null
  } catch {
    return null
  }
}

interface MerchantMember {
  id: string
  user_id: string
  email: string
  role: string
  created_at: string
}

async function getMembers(_supabase: any, merchantId: string): Promise<MerchantMember[]> {
  try {
    const admin = createAdminClient()
    const { data: members } = await admin
      .from('merchant_users')
      .select('id, user_id, role, created_at')
      .eq('merchant_id', merchantId)
      .order('created_at')

    if (!members || members.length === 0) return []

    const userIds = members.map((m: any) => m.user_id)
    const { data: usersData, error } = await admin.auth.admin.listUsers({ perPage: 1000 })

    if (error || !usersData) return []

    const userMap = new Map(usersData.users.map((u: any) => [u.id, u.email || '']))

    return members.map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      email: userMap.get(m.user_id) || '(알 수 없음)',
      role: m.role,
      created_at: m.created_at,
    }))
  } catch {
    return []
  }
}

async function getAllUsers(_supabase: any, currentMemberUserIds: string[]): Promise<AvailableUser[]> {
  try {
    const admin = createAdminClient()
    const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (error || !users) return []
    return users.users
      .filter((u: any) => !currentMemberUserIds.includes(u.id))
      .map((u: any) => ({ id: u.id, email: u.email || '' }))
  } catch {
    return []
  }
}

export interface MerchantKey {
  id: string
  name: string
  mid: string
  enc_key: string
  online_ak: string
  description: string | null
  is_active: boolean
  env: 'production' | 'development'
  created_at: string
  store_id: string | null
  store_name: string | null
}

async function getMerchantKeys(supabase: any, merchantId: string): Promise<MerchantKey[]> {
  try {
    const { data: keys } = await supabase
      .from('merchant_keys')
      .select('id, name, mid, enc_key, online_ak, description, is_active, env, created_at, store_id')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })

    if (!keys || keys.length === 0) return []

    const storeIds = [...new Set(keys.map((k: any) => k.store_id).filter(Boolean))]
    let storeNameMap = new Map<string, string>()

    if (storeIds.length > 0) {
      const { data: stores } = await supabase
        .from('stores')
        .select('id, store_name')
        .in('id', storeIds)
      if (stores) {
        storeNameMap = new Map(stores.map((s: any) => [s.id, s.store_name]))
      }
    }

    return keys.map((k: any) => ({
      ...k,
      mid: `****${k.mid.slice(-4)}`,
      enc_key: `****${k.enc_key.slice(-4)}`,
      online_ak: `****${k.online_ak.slice(-4)}`,
      store_name: k.store_id ? (storeNameMap.get(k.store_id) ?? null) : null,
    }))
  } catch {
    return []
  }
}

async function getStores(supabase: any, merchantId: string): Promise<Store[]> {
  try {
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .eq('merchant_id', merchantId)
    return stores || []
  } catch {
    return []
  }
}

interface Terminal {
  id: string
  term_id: string
  name: string
  status: 'online' | 'offline'
  store_id: string
  store_name: string
  created_at: string
}

async function getTerminals(supabase: any, merchantId: string): Promise<Terminal[]> {
  try {
    const { data: stores } = await supabase
      .from('stores')
      .select('id, store_name')
      .eq('merchant_id', merchantId)

    if (!stores || stores.length === 0) return []

    const storeIds = stores.map((s: any) => s.id)
    const { data: terminals } = await supabase
      .from('terminals')
      .select('id, term_id, name, status, store_id, created_at')
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })

    const storeNameMap = new Map(stores.map((s: any) => [s.id, s.store_name]))

    return (terminals || []).map((t: any) => ({
      ...t,
      store_name: storeNameMap.get(t.store_id) || '알수없음',
    }))
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

  const [merchant, stores, terminals, keys] = await Promise.all([
    getMerchant(supabase, id),
    getStores(supabase, id),
    getTerminals(supabase, id),
    getMerchantKeys(supabase, id),
  ])

  const members = merchant ? await getMembers(supabase, merchant.id) : []

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

  const availableUsers = canEdit
    ? await getAllUsers(supabase, members.map(m => m.user_id))
    : []

  return (
    <MerchantDetailClient
      merchant={merchant}
      members={members}
      availableUsers={availableUsers}
      stores={stores}
      terminals={terminals}
      merchantKeys={keys}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
}
