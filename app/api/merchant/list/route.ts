import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!mu || mu.role !== 'platform_store_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, name, biz_no')
    .order('name')

  return NextResponse.json({ data: merchants ?? [] })
}
