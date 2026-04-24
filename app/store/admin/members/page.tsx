import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMerchantId } from '@/lib/merchant/getMerchantId'
import { getEmailMapByIds } from '@/lib/supabase/emailMap'
import MembersClient from './MembersClient'

export const revalidate = 0

export type Member = {
  id: string
  user_id: string
  role: string
  email: string
  created_at: string
}

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('merchant_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')
  if (membership.role === 'store_manager') redirect('/store/admin')

  const merchantId = await getMerchantId(supabase) ?? membership.merchant_id

  const { data: rawMembers } = await supabase
    .from('merchant_users')
    .select('id, user_id, role, created_at')
    .eq('merchant_id', merchantId)
    .order('created_at')

  const emailMap = await getEmailMapByIds(rawMembers?.map(m => m.user_id) ?? [])
  const members: Member[] = (rawMembers ?? []).map(m => ({
    ...m,
    email: emailMap[m.user_id] ?? '(알 수 없음)',
  }))

  return (
    <MembersClient
      members={members}
      myRole={membership.role}
      merchantId={merchantId}
      currentUserId={user.id}
    />
  )
}
