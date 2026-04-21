import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)
  const { data: mu } = await supabase.from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const { data: settlement } = await supabase
    .from('settlements')
    .select('*')
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)
    .single()

  if (!settlement) return apiError('NOT_FOUND', '정산을 찾을 수 없습니다', 404)

  const { data: items } = await supabase
    .from('settlement_items')
    .select('*')
    .eq('settlement_id', id)
    .order('employee_no')

  // format 다운로드는 Task 11 완료 후 추가 예정
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')
  if (format === 'excel' || format === 'pdf') {
    return apiError('NOT_IMPLEMENTED', '다운로드 기능은 준비 중입니다', 501)
  }

  return NextResponse.json({ data: settlement, items: items ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)
  const { data: mu } = await supabase.from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const body = await req.json()
  if (body.status !== 'confirmed') {
    return apiError('INVALID_ACTION', 'confirmed 상태로만 변경 가능합니다', 400)
  }

  const { data, error } = await supabase
    .from('settlements')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)
    .eq('status', 'draft')
    .select()
    .single()

  if (error || !data) return apiError('NOT_FOUND_OR_CONFIRMED', '정산을 찾을 수 없거나 이미 확정됐습니다', 404)
  return NextResponse.json({ data })
}
