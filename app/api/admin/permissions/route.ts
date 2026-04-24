import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'

export async function GET() {
  const adminDb = createAdminClient()
  const { data, error } = await adminDb.from('role_permissions').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
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
