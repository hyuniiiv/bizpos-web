import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, id } = body
  if (!type || !id || typeof id !== 'string') {
    return NextResponse.json({ error: 'type and id required' }, { status: 400 })
  }

  let cookieName: string

  if (type === 'merchant') {
    const { data: mu } = await supabase
      .from('merchant_users')
      .select('role, merchant_id')
      .eq('user_id', user.id)
      .single()
    if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (mu.role !== 'platform_store_admin' && mu.merchant_id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (mu.role === 'platform_store_admin') {
      const { count } = await supabase
        .from('merchant_users')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', id)
      if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    cookieName = 'bp_selected_merchant'
  } else if (type === 'client') {
    const { data: cu } = await supabase
      .from('client_users')
      .select('role, client_id')
      .eq('user_id', user.id)
      .single()
    if (!cu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (cu.role !== 'platform_client_admin' && cu.client_id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (cu.role === 'platform_client_admin') {
      const { count } = await supabase
        .from('client_users')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', id)
      if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    cookieName = 'bp_selected_client'
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(cookieName, id, {
    path: '/',
    maxAge: 86400,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  return res
}
