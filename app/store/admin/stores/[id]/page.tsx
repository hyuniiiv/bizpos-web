import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StoreDetailClient from './StoreDetailClient'
import { getEmailMapByIds } from '@/lib/supabase/emailMap'

interface Terminal {
  id: string
  term_id: string
  name: string
  status: 'online' | 'offline'
  created_at: string
}

interface StoreData {
  id: string
  store_name: string
  merchant_id: string
  address: string
  is_active: boolean
  description: string | null
  created_at: string
}

interface StoreManager {
  id: string
  user_id: string
  email: string
  role: string
  created_at: string
}

async function getStore(supabase: any, id: string): Promise<StoreData | null> {
  try {
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single()
    return store || null
  } catch {
    return null
  }
}

async function getTerminals(supabase: any, storeId: string): Promise<Terminal[]> {
  try {
    const { data: terminals } = await supabase
      .from('terminals')
      .select('id, term_id, name, status, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    return terminals || []
  } catch {
    return []
  }
}

async function getStoreManagers(supabase: any, storeId: string): Promise<StoreManager[]> {
  try {
    const { data: members } = await supabase
      .from('merchant_users')
      .select('id, user_id, role, created_at')
      .eq('store_id', storeId)
      .in('role', ['store_admin', 'store_manager'])
      .order('created_at')

    if (!members || members.length === 0) return []

    const emailMap = await getEmailMapByIds(members.map((m: any) => m.user_id))
    return members.map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      email: emailMap[m.user_id] ?? '(알 수 없음)',
      created_at: m.created_at,
    }))
  } catch {
    return []
  }
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [store, terminals] = await Promise.all([
    getStore(supabase, id),
    getTerminals(supabase, id),
  ])

  if (!store) {
    notFound()
  }

  const managers = await getStoreManagers(supabase, id)

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user?.id || '')
    .single()

  const canEdit = membership?.role === 'platform_admin' || membership?.role === 'merchant_admin'
  const canDelete = membership?.role === 'platform_admin'

  return (
    <StoreDetailClient
      store={store}
      terminals={terminals}
      managers={managers}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
}
