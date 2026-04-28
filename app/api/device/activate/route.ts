import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTerminalJWT } from '@/lib/terminal/jwt'
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit'
import { apiError } from '@/lib/api/error'

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request, 'device-activate'), 5, 15 * 60 * 1000)
  if (!rl.allowed) {
    return apiError('RATE_LIMITED', `너무 많은 시도입니다. ${rl.retryAfter}초 후 다시 시도하세요`, 429)
  }

  let activationCode: string | undefined
  let terminalName: string | undefined
  try {
    const body = await request.json()
    activationCode = body.activationCode
    terminalName = body.terminalName
  } catch {
    return NextResponse.json({ error: 'MISSING_CODE' }, { status: 400 })
  }

  if (!activationCode) {
    return NextResponse.json({ error: 'MISSING_CODE' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: terminal, error } = await supabase
    .from('terminals')
    .select('*, merchants(id, name, merchant_id)')
    .eq('activation_code', activationCode)
    .single()

  if (error || !terminal) {
    return NextResponse.json({ error: 'INVALID_CODE' }, { status: 404 })
  }

  const accessToken = await createTerminalJWT({
    terminalId: terminal.id,
    merchantId: terminal.merchant_id,
    termId: terminal.term_id,
  })

  // 원자적 조건부 UPDATE: access_token이 NULL인 경우에만 성공 (TOCTOU 경쟁 조건 방지)
  const { data: activated, error: updateError } = await supabase
    .from('terminals')
    .update({
      access_token: accessToken,
      name: terminalName || terminal.name,
      status: 'online',
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', terminal.id)
    .is('access_token', null)
    .select('id')
    .single()

  if (updateError || !activated) {
    return NextResponse.json({ error: 'ALREADY_ACTIVATED' }, { status: 409 })
  }

  const { data: configRow } = await supabase
    .from('terminal_configs')
    .select('config, version')
    .eq('terminal_id', terminal.id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    terminalId: terminal.id,
    termId: terminal.term_id,
    accessToken,
    merchantId: terminal.merchant_id,
    storeId: terminal.store_id,
    name: terminal.name ?? null,
    corner: terminal.corner,
    terminalType: terminal.terminal_type ?? 'ticket_checker',
    config: configRow?.config ?? null,
    configVersion: configRow?.version ?? 0,
  })
}
