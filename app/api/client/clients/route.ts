import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('client_users')
    .select('role, client_id')
    .eq('user_id', userId)
    .single()
  return data
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cu = await getMembership(supabase, user.id)
  if (!cu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let q = supabase
    .from('clients')
    .select('id, client_name, biz_no, is_active, created_at')
    .order('client_name')

  if (cu.role !== 'platform_client_admin') {
    q = q.eq('id', cu.client_id)
  }

  const { data } = await q
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cu = await getMembership(supabase, user.id)
  if (cu?.role !== 'platform_client_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('clients')
    .insert({
      client_name: body.client_name,
      biz_no: body.biz_no,
      is_active: body.is_active ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cu = await getMembership(supabase, user.id)
  if (!cu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body

  if (cu.role !== 'platform_client_admin' && id !== cu.client_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      client_name: updates.client_name,
      biz_no: updates.biz_no,
      is_active: updates.is_active,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cu = await getMembership(supabase, user.id)
  if (cu?.role !== 'platform_client_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
