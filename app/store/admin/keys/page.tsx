import { createClient } from '@/lib/supabase/server'
import MerchantKeyClient from '@/components/dashboard/MerchantKeyClient'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function MerchantKeysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  const { data: keys } = await supabase
    .from('merchant_keys')
    .select('id, name, mid, enc_key, online_ak, description, is_active, env, store_id, created_at')
    .eq('merchant_id', merchantUser?.merchant_id)
    .order('created_at', { ascending: false })

  return <MerchantKeyClient initialKeys={keys ?? []} />
}
