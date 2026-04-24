import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoresClient from './StoresClient'

export const revalidate = 0

export type StoreKey = {
  id: string
  name: string
  mid: string
  enc_key: string
  online_ak: string
  description: string | null
  is_active: boolean
  env: 'production' | 'development'
  store_id: string | null
  created_at: string
}

export type Store = {
  id: string
  store_name: string
  biz_no: string | null
  is_active: boolean
  merchant_id: string
  created_at: string
  merchant_keys: StoreKey[]
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
    .select(`
      id,
      store_name,
      biz_no,
      is_active,
      merchant_id,
      created_at,
      merchant_keys (
        id, name, mid, enc_key, online_ak, description, is_active, env, store_id, created_at
      )
    `)
    .order('created_at', { ascending: true })

  if (!isPlatformAdmin) {
    q = q.eq('merchant_id', membership.merchant_id)
  }

  const { data: stores } = await q

  // 서버사이드 키 마스킹
  const maskedStores = (stores ?? []).map(s => ({
    ...s,
    merchant_keys: (s.merchant_keys ?? []).map((k: StoreKey) => ({
      ...k,
      mid: `****${k.mid.slice(-4)}`,
      enc_key: `****${k.enc_key.slice(-4)}`,
      online_ak: `****${k.online_ak.slice(-4)}`,
    })),
  })) as Store[]

  return (
    <StoresClient
      stores={maskedStores}
      myRole={membership.role}
      merchantId={membership.merchant_id}
    />
  )
}
