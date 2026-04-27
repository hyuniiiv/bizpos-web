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
    const { data: managers, error } = await supabase
      .from('merchant_users')
      .select('user_id')
      .eq('role', 'manager')

    if (error) throw error

    if (!managers || managers.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const userIds = managers.map(m => m.user_id)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) throw usersError

    const managersList = users.users
      .filter(u => userIds.includes(u.id))
      .map(u => ({
        id: u.id,
        email: u.email || '',
      }))

    return NextResponse.json({ data: managersList })
  } catch (error) {
    const message = error instanceof Error ? error.message : '매니저 조회 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
