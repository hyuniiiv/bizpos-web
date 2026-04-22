import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientId } from '@/lib/client/getClientId'
import ClientMembersClient from './ClientMembersClient'

export const revalidate = 0

export type Member = {
  id: string
  user_id: string
  role: string
  email: string
  created_at: string
}

export default async function ClientMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('client_users')
    .select('client_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')
  if (membership.role === 'client_operator') redirect('/client/admin')

  const clientId = await getClientId(supabase) ?? membership.client_id

  const { data: rawMembers } = await supabase
    .from('client_users')
    .select('id, user_id, role, created_at')
    .eq('client_id', clientId)
    .order('created_at')

  const members: Member[] = []
  if (rawMembers?.length) {
    const admin = createAdminClient()
    await Promise.all(
      rawMembers.map(async m => {
        const { data } = await admin.auth.admin.getUserById(m.user_id)
        members.push({ ...m, email: data.user?.email ?? '(알 수 없음)' })
      })
    )
    members.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  return (
    <ClientMembersClient
      members={members}
      myRole={membership.role}
      clientId={clientId}
      currentUserId={user.id}
    />
  )
}
