import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { requireTerminalAuth } = await import('@/lib/terminal/auth')
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload
  const { version } = await request.json()

  if (!version || typeof version !== 'string') {
    return NextResponse.json({ error: 'MISSING_VERSION' }, { status: 400 })
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  await supabase
    .from('terminals')
    .update({ current_app_version: version })
    .eq('id', terminalId)

  return NextResponse.json({ ok: true })
}
