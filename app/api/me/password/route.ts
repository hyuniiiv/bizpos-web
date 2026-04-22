import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createVerifyClient } from '@/lib/supabase/verify'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 모두 입력하세요.' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  // HIGH-1: persistSession:false 클라이언트로 검증 — 세션 쿠키 부작용 방지
  const verifyClient = createVerifyClient()
  const { error: signInErr } = await verifyClient.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })
  if (signInErr) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
  if (error) {
    console.error('[me/password]', error)
    return NextResponse.json({ error: '비밀번호 변경 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
