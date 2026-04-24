import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEmailMapByIds } from '@/lib/supabase/emailMap'

async function getMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('merchant_users')
    .select('role, merchant_id')
    .eq('user_id', userId)
    .single()
  return data
}

async function getStoreAndVerify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
  merchantId: string,
  isPlatform: boolean,
) {
  const { data: store } = await supabase
    .from('stores')
    .select('id, merchant_id')
    .eq('id', storeId)
    .single()
  if (!store) return null
  if (!isPlatform && store.merchant_id !== merchantId) return null
  return store
}

// GET ?store_id=xxx — 해당 매장의 담당자 목록
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const storeId = new URL(req.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const isPlatform = mu.role === 'platform_admin'
  const store = await getStoreAndVerify(supabase, storeId, mu.merchant_id, isPlatform)
  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: sms } = await supabase
    .from('store_managers')
    .select('id, user_id, created_at')
    .eq('store_id', storeId)

  if (!sms?.length) return NextResponse.json({ data: [] })

  const { data: mus } = await supabase
    .from('merchant_users')
    .select('user_id, role')
    .eq('merchant_id', store.merchant_id)
    .in('user_id', sms.map(s => s.user_id))

  const roleMap: Record<string, string> = {}
  mus?.forEach(m => { roleMap[m.user_id] = m.role })

  const emailMap = await getEmailMapByIds(sms.map(s => s.user_id))
  const entries = sms.map(s => ({ ...s, email: emailMap[s.user_id] ?? '(알 수 없음)', role: roleMap[s.user_id] ?? '' }))

  return NextResponse.json({ data: entries })
}

// POST { store_id, user_id } — 담당자 추가
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu || mu.role === 'store_manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { store_id, user_id } = await req.json()
  if (!store_id || !user_id) return NextResponse.json({ error: 'store_id, user_id required' }, { status: 400 })

  const isPlatform = mu.role === 'platform_admin'
  const store = await getStoreAndVerify(supabase, store_id, mu.merchant_id, isPlatform)
  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: targetMu } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user_id)
    .eq('merchant_id', store.merchant_id)
    .single()
  if (!targetMu) return NextResponse.json({ error: '해당 사용자가 이 매장의 소속 멤버가 아닙니다.' }, { status: 400 })

  const { data, error } = await supabase
    .from('store_managers')
    .insert({ store_id, user_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '이미 배정된 담당자입니다.' }, { status: 409 })
    console.error('[store-members POST]', error)
    return NextResponse.json({ error: '담당자 추가 중 오류가 발생했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// DELETE { id } — 담당자 제거
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu || mu.role === 'store_manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { data: sm } = await supabase.from('store_managers').select('store_id').eq('id', id).single()
  if (!sm) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isPlatform = mu.role === 'platform_admin'
  const store = await getStoreAndVerify(supabase, sm.store_id, mu.merchant_id, isPlatform)
  if (!store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('store_managers').delete().eq('id', id)
  if (error) {
    console.error('[store-members DELETE]', error)
    return NextResponse.json({ error: '담당자 제거 중 오류가 발생했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
