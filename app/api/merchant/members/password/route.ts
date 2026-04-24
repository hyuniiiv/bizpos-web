import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MERCHANT_ASSIGNABLE as ASSIGNABLE, MERCHANT_PLATFORM_ROLES as PLATFORM_ROLES } from '@/lib/roles/assignable'

async function getMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('merchant_users')
    .select('role, merchant_id')
    .eq('user_id', userId)
    .single()
  return data
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, newPassword } = await req.json()
  if (!id || !newPassword) {
    return NextResponse.json({ error: '대상 ID와 새 비밀번호를 입력하세요.' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  const { data: target } = await supabase
    .from('merchant_users')
    .select('merchant_id, user_id, role')
    .eq('id', id)
    .single()
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (mu.role !== 'platform_admin' && target.merchant_id !== mu.merchant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!ASSIGNABLE[mu.role]?.includes(target.role)) {
    return NextResponse.json({ error: '해당 멤버의 비밀번호를 변경할 권한이 없습니다.' }, { status: 403 })
  }
  if (target.user_id === user.id) {
    return NextResponse.json({ error: '본인 비밀번호는 내 계정 설정에서 변경하세요.' }, { status: 400 })
  }
  if (PLATFORM_ROLES.has(target.role)) {
    return NextResponse.json({ error: '시스템관리자 계정은 비밀번호를 재설정할 수 없습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(target.user_id, { password: newPassword })
  if (error) {
    console.error('[merchant/members/password POST]', error)
    return NextResponse.json({ error: '비밀번호 변경 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
