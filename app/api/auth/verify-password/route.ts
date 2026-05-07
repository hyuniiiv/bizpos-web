import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: '비밀번호를 입력하세요' }, { status: 400 })

  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password })
  if (error) return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 })

  return NextResponse.json({ verified: true })
}
