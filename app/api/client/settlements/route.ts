import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientId } from '@/lib/client/getClientId'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { period_start, period_end } = await req.json() as {
    period_start: string
    period_end: string
  }

  const { data: usages } = await supabase
    .from('meal_usages')
    .select('employee_id, meal_type, amount')
    .eq('client_id', clientId)
    .gte('used_at', period_start)
    .lte('used_at', period_end + 'T23:59:59')

  const rows = usages ?? []
  const total_count = rows.length
  const total_amount = rows.reduce((s, u) => s + u.amount, 0)

  const { data: settlement, error: sErr } = await supabase
    .from('settlements')
    .insert({ client_id: clientId, period_start, period_end, total_count, total_amount })
    .select()
    .single()

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  type EmpAgg = {
    breakfast_count: number; lunch_count: number; dinner_count: number
    total_amount: number; usage_count: number
  }
  const empMap = new Map<string, EmpAgg>()
  for (const u of rows) {
    const cur = empMap.get(u.employee_id) ??
      { breakfast_count: 0, lunch_count: 0, dinner_count: 0, total_amount: 0, usage_count: 0 }
    const key = `${u.meal_type}_count` as keyof EmpAgg
    ;(cur[key] as number)++
    cur.total_amount += u.amount
    cur.usage_count++
    empMap.set(u.employee_id, cur)
  }

  const empIds = [...empMap.keys()]
  if (empIds.length > 0) {
    const { data: emps } = await supabase
      .from('employees')
      .select('id, employee_no, name, department')
      .in('id', empIds)

    const items = (emps ?? []).map(e => ({
      settlement_id: settlement.id,
      employee_id: e.id,
      employee_no: e.employee_no,
      employee_name: e.name,
      department: e.department,
      ...empMap.get(e.id),
    }))
    await supabase.from('settlement_items').insert(items)
  }

  return NextResponse.json({ data: settlement })
}
