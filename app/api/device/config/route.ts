import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'

export async function GET(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload
  const currentVersion = parseInt(request.headers.get('X-Config-Version') ?? '0')

  const supabase = createAdminClient()

  const { data: configRow } = await supabase
    .from('terminal_configs')
    .select('config, version')
    .eq('terminal_id', terminalId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const { data: terminal } = await supabase
    .from('terminals')
    .update({ status: 'online', last_seen_at: new Date().toISOString() })
    .eq('id', terminalId)
    .select('name')
    .single()

  const termName = terminal?.name ?? null

  if (!configRow || configRow.version <= currentVersion) {
    return NextResponse.json({ version: currentVersion, changed: false, termName })
  }

  return NextResponse.json({
    version: configRow.version,
    config: configRow.config,
    changed: true,
    termName,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload

  let config: unknown
  try {
    config = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return NextResponse.json({ error: 'INVALID_CONFIG' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: latest } = await supabase
    .from('terminal_configs')
    .select('version')
    .eq('terminal_id', terminalId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (latest?.version ?? 0) + 1

  const { error } = await supabase
    .from('terminal_configs')
    .insert({ terminal_id: terminalId, config, version: nextVersion })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, version: nextVersion })
}
