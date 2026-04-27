import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KeyDetailClient from './KeyDetailClient'

export const revalidate = 0

export default async function KeyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: key, error } = await supabase
    .from('merchant_keys')
    .select('id, name, mid, enc_key, online_ak, description, is_active, env, store_id, merchant_id, created_at')
    .eq('id', id)
    .single()

  if (error || !key) return notFound()

  const [{ data: merchant }, storeResult] = await Promise.all([
    supabase.from('merchants').select('id, name').eq('id', key.merchant_id).single(),
    key.store_id
      ? supabase.from('stores').select('store_name').eq('id', key.store_id).single()
      : Promise.resolve({ data: null }),
  ])

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const canEdit = membership?.role === 'platform_admin' || membership?.role === 'merchant_admin'
  const canDelete = membership?.role === 'platform_admin'

  return (
    <KeyDetailClient
      keyData={{
        ...key,
        store_name: storeResult.data?.store_name ?? null,
        merchant_name: merchant?.name ?? null,
      }}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
}
