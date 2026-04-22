import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — 단말기 비활성화 (토큰 revoke)
export async function POST(
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
    .update({ access_token: null, status: 'inactive' })
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
