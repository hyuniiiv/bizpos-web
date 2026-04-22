import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH — 단말기 속성 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: mu } = await supabase
    .from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return NextResponse.json({ error: 'MERCHANT_NOT_FOUND' }, { status: 403 })

  const body = await req.json()
  const allowed = ['name', 'corner', 'term_id', 'activation_code', 'terminal_type']
  const updates: Record<string, string> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // RLS 정책이 merchant_id 소유권을 검증함
  const { data, error } = await supabase
    .from('terminals')
    .update(updates)
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — 단말기 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: mu } = await supabase
    .from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return NextResponse.json({ error: 'MERCHANT_NOT_FOUND' }, { status: 403 })

  const { error } = await supabase
    .from('terminals')
    .delete()
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
