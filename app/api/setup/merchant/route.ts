import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 최초 1회 가맹점 초기화 — 로그인한 유저에게 merchant + merchant_users 생성
// merchants/merchant_users 테이블은 RLS 비활성화 상태여야 함
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  // 이미 존재하면 그대로 반환
  const { data: existing } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ merchantId: existing.merchant_id, created: false })

  // merchants 생성
  const { data: merchant, error: merErr } = await supabase
    .from('merchants')
    .insert({ name: user.email?.split('@')[0] ?? '가맹점' })
    .select()
    .single()

  if (merErr) return NextResponse.json({ error: merErr.message }, { status: 500 })

  // merchant_users 연결
  const { error: muErr } = await supabase
    .from('merchant_users')
    .insert({ merchant_id: merchant.id, user_id: user.id, role: 'admin' })

  if (muErr) return NextResponse.json({ error: muErr.message }, { status: 500 })

  return NextResponse.json({ merchantId: merchant.id, created: true })
}
