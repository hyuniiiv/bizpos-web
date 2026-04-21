import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)
  const { data: mu } = await supabase.from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('merchant_id', mu.merchant_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return apiError('DB_ERROR', error.message, 500)
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)
  const { data: mu } = await supabase.from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const body = await req.json()
  const { period_start, period_end } = body as { period_start: string; period_end: string }
  if (!period_start || !period_end) {
    return apiError('MISSING_FIELDS', 'period_start, period_end 필수', 400)
  }

  // 겹치는 기간의 정산 중복 방어
  const { data: overlap } = await supabase
    .from('settlements')
    .select('id')
    .eq('merchant_id', mu.merchant_id)
    .lte('period_start', period_end)
    .gte('period_end', period_start)
    .limit(1)

  if (overlap && overlap.length > 0) {
    return apiError('DUPLICATE_PERIOD', '해당 기간과 겹치는 정산이 이미 존재합니다', 409)
  }

  // 기간 내 식사 사용 내역 집계
  const { data: usages, error: usageError } = await supabase
    .from('meal_usages')
    .select('employee_id, meal_type, amount')
    .eq('merchant_id', mu.merchant_id)
    .gte('used_at', period_start)
    .lte('used_at', period_end + 'T23:59:59')

  if (usageError) return apiError('DB_ERROR', usageError.message, 500)

  // employee별 집계
  type EmpStats = { usage_count: number; total_amount: number; breakfast_count: number; lunch_count: number; dinner_count: number }
  const empMap = new Map<string, EmpStats>()

  for (const u of usages ?? []) {
    const prev: EmpStats = empMap.get(u.employee_id) ?? { usage_count: 0, total_amount: 0, breakfast_count: 0, lunch_count: 0, dinner_count: 0 }
    prev.usage_count += 1
    prev.total_amount += u.amount
    if (u.meal_type === 'breakfast') prev.breakfast_count += 1
    if (u.meal_type === 'lunch') prev.lunch_count += 1
    if (u.meal_type === 'dinner') prev.dinner_count += 1
    empMap.set(u.employee_id, prev)
  }

  const allStats = Array.from(empMap.values())
  const totalCount = allStats.reduce((s, e) => s + e.usage_count, 0)
  const totalAmount = allStats.reduce((s, e) => s + e.total_amount, 0)

  // settlements INSERT
  const { data: settlement, error: settleError } = await supabase
    .from('settlements')
    .insert({ merchant_id: mu.merchant_id, period_start, period_end, total_count: totalCount, total_amount: totalAmount, status: 'draft' })
    .select()
    .single()

  if (settleError) return apiError('DB_ERROR', settleError.message, 500)

  // employee 정보 조회
  const employeeIds = Array.from(empMap.keys())
  const empInfo = new Map<string, { employee_no: string; name: string; department: string | null }>()
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('id, employee_no, name, department')
      .in('id', employeeIds)
    ;(employees ?? []).forEach(e => empInfo.set(e.id, e))
  }

  // settlement_items INSERT
  const items = Array.from(empMap.entries()).map(([empId, stats]) => {
    const info = empInfo.get(empId)
    return {
      settlement_id: settlement.id,
      employee_id: empId,
      employee_no: info?.employee_no ?? '',
      employee_name: info?.name ?? '',
      department: info?.department ?? undefined,
      ...stats,
    }
  })

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from('settlement_items').insert(items)
    if (itemsError) {
      // rollback: settlement 삭제
      await supabase.from('settlements').delete().eq('id', settlement.id)
      return apiError('DB_ERROR', itemsError.message, 500)
    }
  }

  return NextResponse.json({ data: settlement }, { status: 201 })
}
