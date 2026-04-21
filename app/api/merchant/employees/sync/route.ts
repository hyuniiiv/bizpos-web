import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError } from '@/lib/api/error'

interface EmployeeRow {
  employee_no: string
  name: string
  department?: string
  card_number?: string
  barcode?: string
}

export async function POST(req: NextRequest) {
  const merchantKey = req.headers.get('X-Merchant-Key')
  if (!merchantKey) return apiError('UNAUTHORIZED', 'X-Merchant-Key 헤더가 필요합니다', 401)

  const supabase = createAdminClient()

  // online_ak 컬럼이 HEADER 인증키 (20260323000001_merchant_terminal_key.sql 기준)
  const { data: keyRow } = await supabase
    .from('merchant_keys')
    .select('merchant_id')
    .eq('online_ak', merchantKey)
    .eq('is_active', true)
    .single()

  if (!keyRow) return apiError('INVALID_KEY', '유효하지 않은 키입니다', 401)

  const body = await req.json()
  const employees: EmployeeRow[] = body.employees ?? []

  if (!Array.isArray(employees) || employees.length === 0) {
    return apiError('MISSING_EMPLOYEES', 'employees 배열이 필요합니다', 400)
  }

  const rows = employees.map((e) => ({ ...e, merchant_id: keyRow.merchant_id }))

  const { error } = await supabase
    .from('employees')
    .upsert(rows, { onConflict: 'merchant_id,employee_no', ignoreDuplicates: false })

  if (error) return apiError('DB_ERROR', error.message, 500)

  return NextResponse.json({ ok: true, synced: rows.length })
}
