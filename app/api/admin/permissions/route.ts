import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return mu?.role === 'platform_admin' ? user : null
}

export async function GET() {
  if (!await requirePlatformAdmin())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()
  const { data, error } = await adminDb.from('role_permissions').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  if (!await requirePlatformAdmin())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()
  const { id, can_create, can_read, can_update, can_delete } = await req.json()

  const { data, error } = await adminDb
    .from('role_permissions')
    .update({ can_create, can_read, can_update, can_delete })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
