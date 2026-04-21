import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const body = await req.json()
  const { data, error } = await supabase
    .from('employees')
    .update(body)
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)
    .select()
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)
  return NextResponse.json({ data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const { error } = await supabase
    .from('employees')
    .update({ is_active: false })
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)

  if (error) return apiError('DB_ERROR', error.message, 500)
  return NextResponse.json({ ok: true })
}
