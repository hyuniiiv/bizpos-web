import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'

// GET /api/merchant/keys — 가맹점 키 목록 조회 (?store_id= 필터 지원)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()
  if (!merchantUser) return apiError('MERCHANT_NOT_FOUND', '가맹점 정보를 찾을 수 없습니다', 403)

  const storeId = req.nextUrl.searchParams.get('store_id')

  let q = supabase
    .from('merchant_keys')
    .select('id, name, mid, enc_key, online_ak, description, is_active, env, store_id, created_at, updated_at')
    .eq('merchant_id', merchantUser.merchant_id)
    .order('created_at', { ascending: false })

  if (storeId) q = q.eq('store_id', storeId)

  const { data, error } = await q

  if (error) return apiError('DB_ERROR', error.message, 500)

  // 보안: 민감 키 값 서버사이드 마스킹 (마지막 4자만 노출)
  const masked = (data ?? []).map(k => ({
    ...k,
    mid: `****${k.mid.slice(-4)}`,
    enc_key: `****${k.enc_key.slice(-4)}`,
    online_ak: `****${k.online_ak.slice(-4)}`,
  }))
  return NextResponse.json({ keys: masked })
}

// POST /api/merchant/keys — 가맹점 키 등록
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()
  if (!merchantUser) return apiError('MERCHANT_NOT_FOUND', '가맹점 정보를 찾을 수 없습니다', 403)

  const body = await req.json()
  const { name, mid, enc_key, online_ak, description, env, store_id } = body

  if (!name || !mid || !enc_key || !online_ak) {
    return apiError('INVALID_INPUT', 'name, mid, enc_key, online_ak 필드가 필요합니다', 400)
  }

  const { data, error } = await supabase
    .from('merchant_keys')
    .insert({
      merchant_id: merchantUser.merchant_id,
      name,
      mid,
      enc_key,
      online_ak,
      description: description ?? null,
      env: env === 'development' ? 'development' : 'production',
      store_id: store_id ?? null,
    })
    .select()
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)
  return NextResponse.json(data, { status: 201 })
}
