import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'

/**
 * GET /api/device/commands
 * 단말기가 자신에게 대기 중인 원격 명령을 폴링
 * received_at IS NULL인 가장 오래된 명령 1건 반환
 */
export async function GET(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('terminal_commands')
    .select('id, command, args, created_at')
    .eq('terminal_id', terminalId)
    .is('received_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ command: null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ command: data })
}

/**
 * PATCH /api/device/commands/:id
 * 단말기가 명령 실행 결과를 기록
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload

  let body: { id: string; received_at?: string; executed_at?: string; result?: unknown; error?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  if (!body.id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })

  const supabase = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (body.received_at !== undefined) updates.received_at = body.received_at
  if (body.executed_at !== undefined) updates.executed_at = body.executed_at
  if (body.result !== undefined) updates.result = body.result
  if (body.error !== undefined) updates.error = body.error

  const { error } = await supabase
    .from('terminal_commands')
    .update(updates)
    .eq('id', body.id)
    .eq('terminal_id', terminalId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
