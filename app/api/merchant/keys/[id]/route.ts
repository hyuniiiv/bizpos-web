import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'

// GET /api/merchant/keys/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const { data, error } = await supabase
    .from('merchant_keys')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return apiError('NOT_FOUND', '가맹점 키를 찾을 수 없습니다', 404)
  return NextResponse.json(data)
}

// PUT /api/merchant/keys/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const body = await req.json()
  const { name, mid, enc_key, online_ak, description, is_active, env } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (mid !== undefined) updates.mid = mid
  if (enc_key !== undefined) updates.enc_key = enc_key
  if (online_ak !== undefined) updates.online_ak = online_ak
  if (description !== undefined) updates.description = description
  if (is_active !== undefined) updates.is_active = is_active
  if (env !== undefined) updates.env = env === 'development' ? 'development' : 'production'

  const { data, error } = await supabase
    .from('merchant_keys')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)
  return NextResponse.json(data)
}

// DELETE /api/merchant/keys/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const { error } = await supabase
    .from('merchant_keys')
    .delete()
    .eq('id', id)

  if (error) return apiError('DB_ERROR', error.message, 500)
  return NextResponse.json({ success: true })
}
