import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cu } = await supabase
    .from('client_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!cu || cu.role !== 'platform_client_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, client_name, biz_no')
    .eq('is_active', true)
    .order('client_name')

  return NextResponse.json({ data: clients ?? [] })
}
