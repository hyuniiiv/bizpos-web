import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mus } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)

  const hasPlatformAdminRole = mus?.some(mu => mu.role === 'platform_admin')
  if (!hasPlatformAdminRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: admins, error } = await supabase
      .from('merchant_users')
      .select('user_id')
      .eq('role', 'admin')

    if (error) throw error

    if (!admins || admins.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const userIds = admins.map(a => a.user_id)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) throw usersError

    const adminsList = users.users
      .filter(u => userIds.includes(u.id))
      .map(u => ({
        id: u.id,
        email: u.email || '',
      }))

    return NextResponse.json({ data: adminsList })
  } catch (error) {
    const message = error instanceof Error ? error.message : '관리자 조회 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
