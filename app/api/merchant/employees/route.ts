import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const q = searchParams.get('q') ?? ''
  const offset = (page - 1) * limit

  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('merchant_id', mu.merchant_id)
    .order('employee_no')
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.or(`name.ilike.%${q}%,employee_no.ilike.%${q}%,department.ilike.%${q}%`)
  }

  const { data, count, error } = await query
  if (error) return apiError('DB_ERROR', error.message, 500)

  return NextResponse.json({ data, total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
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
  const { employee_no, name, department, card_number, barcode } = body

  if (!employee_no || !name) {
    return apiError('MISSING_FIELDS', 'employee_no, name은 필수입니다', 400)
  }

  const { data, error } = await supabase
    .from('employees')
    .insert({ merchant_id: mu.merchant_id, employee_no, name, department, card_number, barcode })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return apiError('DUPLICATE_EMPLOYEE_NO', '이미 존재하는 사원번호입니다', 409)
    return apiError('DB_ERROR', error.message, 500)
  }

  return NextResponse.json({ data }, { status: 201 })
}
