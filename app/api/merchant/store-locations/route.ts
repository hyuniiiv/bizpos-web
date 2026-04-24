import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('merchant_users')
    .select('role, merchant_id')
    .eq('user_id', userId)
    .single()
  return data
}

// GET /api/merchant/store-locations — 매장(물리적 위치) 목록 + 연결된 keys 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let q = supabase
    .from('stores')
    .select(`
      id,
      store_name,
      biz_no,
      is_active,
      created_at,
      merchant_id,
      merchant_keys (
        id,
        name,
        mid,
        enc_key,
        online_ak,
        description,
        is_active,
        env,
        store_id,
        created_at
      )
    `)
    .order('created_at', { ascending: true })

  if (mu.role !== 'platform_admin') {
    q = q.eq('merchant_id', mu.merchant_id)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const masked = (data ?? []).map(store => ({
    ...store,
    merchant_keys: (store.merchant_keys ?? []).map((k: {
      id: string; name: string; mid: string; enc_key: string; online_ak: string;
      description: string | null; is_active: boolean; env: string; store_id: string | null; created_at: string
    }) => ({
      ...k,
      mid: `****${k.mid.slice(-4)}`,
      enc_key: `****${k.enc_key.slice(-4)}`,
      online_ak: `****${k.online_ak.slice(-4)}`,
    })),
  }))

  return NextResponse.json({ data: masked })
}

// POST /api/merchant/store-locations — 매장 추가
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { store_name, biz_no, merchant_id } = body

  if (!store_name?.trim()) {
    return NextResponse.json({ error: '매장명을 입력하세요' }, { status: 400 })
  }

  const targetMerchantId = mu.role === 'platform_admin' && merchant_id
    ? merchant_id
    : mu.merchant_id

  if (!targetMerchantId) {
    return NextResponse.json({ error: '유효한 가맹점 ID가 없습니다' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('stores')
    .insert({
      merchant_id: targetMerchantId,
      store_name: store_name.trim(),
      biz_no: biz_no?.trim() || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('[store-locations POST] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}

// PATCH /api/merchant/store-locations — 매장 수정
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, store_name, biz_no, is_active } = body

  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  if (mu.role !== 'platform_admin') {
    const { data: store } = await supabase
      .from('stores')
      .select('merchant_id')
      .eq('id', id)
      .single()
    if (!store || store.merchant_id !== mu.merchant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const updates: Record<string, unknown> = {}
  if (store_name !== undefined) updates.store_name = store_name.trim()
  if (biz_no !== undefined) updates.biz_no = biz_no?.trim() || null
  if (is_active !== undefined) updates.is_active = is_active

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('stores')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[store-locations PATCH] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// DELETE /api/merchant/store-locations — 매장 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  if (mu.role !== 'platform_admin') {
    const { data: store } = await supabase
      .from('stores')
      .select('merchant_id')
      .eq('id', id)
      .single()
    if (!store || store.merchant_id !== mu.merchant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const adminDb = createAdminClient()
  const { error } = await adminDb.from('stores').delete().eq('id', id)
  
  if (error) {
    console.error('[store-locations DELETE] delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
