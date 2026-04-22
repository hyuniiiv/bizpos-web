import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientId } from '@/lib/client/getClientId'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ??
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const to = searchParams.get('to') ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('meal_usages')
    .select('id, meal_type, used_at, amount, employees(employee_no, name, department)')
    .eq('client_id', clientId)
    .gte('used_at', from)
    .lte('used_at', to + 'T23:59:59')
    .order('used_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
