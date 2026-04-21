import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getClientId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()
  return data?.client_id ?? null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const q = searchParams.get('q') ?? ''
  const from = (page - 1) * limit

  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId)
    .order('employee_no')
    .range(from, from + limit - 1)

  if (q) {
    query = query.or(`name.ilike.%${q}%,employee_no.ilike.%${q}%,department.ilike.%${q}%`)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await req.json() as Array<{
    employee_no: string
    name: string
    department?: string
    card_number?: string
    barcode?: string
  }>

  const inserts = rows.map(r => ({ ...r, client_id: clientId }))
  const { data, error } = await supabase
    .from('employees')
    .upsert(inserts, { onConflict: 'client_id,employee_no' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ count: data?.length ?? 0 })
}
