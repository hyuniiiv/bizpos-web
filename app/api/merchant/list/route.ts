import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // 소속 가맹점 전체 조회 (멀티 가맹점 지원)
  const { data: memberships } = await admin
    .from('merchant_users')
    .select('merchant_id, role')
    .eq('user_id', user.id)

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isPlatformAdmin = memberships.some(m => m.role === 'platform_admin')

  let query = admin.from('merchants').select('id, name, biz_no').order('name')

  if (!isPlatformAdmin) {
    // 비 플랫폼 어드민: 소속 가맹점만
    query = query.in('id', memberships.map(m => m.merchant_id))
  }

  const { data: merchants } = await query

  return NextResponse.json({ data: merchants ?? [] })
}
