import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('merchant_users')
    .select('role, merchant_id')
    .eq('user_id', userId)
    .single()
  return data
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let q = supabase
    .from('merchants')
    .select('id, name, biz_no, merchant_id, contact_email, created_at')
    .order('name')

  if (mu.role !== 'platform_admin') {
    q = q.eq('id', mu.merchant_id)
  }

  const { data } = await q
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (mu?.role !== 'platform_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('merchants')
    .insert({
      name: body.name,
      biz_no: body.biz_no || null,
      merchant_id: body.merchant_id || null,
      contact_email: body.contact_email || null,
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

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body

  if (mu.role !== 'platform_admin' && id !== mu.merchant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('merchants')
    .update({
      name: updates.name,
      biz_no: updates.biz_no || null,
      merchant_id: updates.merchant_id || null,
      contact_email: updates.contact_email || null,
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

  const mu = await getMembership(supabase, user.id)
  if (mu?.role !== 'platform_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('merchants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
