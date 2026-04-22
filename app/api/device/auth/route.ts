import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTerminalJWT } from '@/lib/terminal/jwt'
import { apiError } from '@/lib/api/error'
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit'
import bcrypt from 'bcryptjs'

/**
 * POST /api/device/auth — 단말기 계정 인증
 * 단말기 계정(terminal_account_id + 비밀번호)으로 JWT 발급
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(req, 'device-auth'))
  if (!rl.allowed) {
    return apiError('RATE_LIMITED', `너무 많은 시도입니다. ${rl.retryAfter}초 후 다시 시도하세요`, 429)
  }

  let terminalAccountId: string | undefined
  let password: string | undefined

  try {
    const body = await req.json()
    terminalAccountId = body.terminalAccountId
    password = body.password
  } catch {
    return apiError('INVALID_BODY', '요청 본문을 파싱할 수 없습니다', 400)
  }

  if (!terminalAccountId || !password) {
    return apiError('MISSING_CREDENTIALS', 'terminalAccountId, password 필드가 필요합니다', 400)
  }

  const supabase = createAdminClient()

  const { data: terminal, error } = await supabase
    .from('terminals')
    .select('*')
    .eq('terminal_account_id', terminalAccountId)
    .single()

  if (error || !terminal) {
    return apiError('INVALID_CREDENTIALS', '아이디 또는 비밀번호가 올바르지 않습니다', 401)
  }

  // 비활성 단말기 차단
  if (terminal.status === 'inactive') {
    return apiError('TERMINAL_INACTIVE', '비활성 상태의 단말기입니다', 403)
  }

  if (!terminal.terminal_account_hash) {
    return apiError('ACCOUNT_NOT_CONFIGURED', '단말기 계정이 설정되지 않았습니다', 401)
  }

  const valid = await bcrypt.compare(password, terminal.terminal_account_hash)
  if (!valid) {
    return apiError('INVALID_CREDENTIALS', '아이디 또는 비밀번호가 올바르지 않습니다', 401)
  }

  const accessToken = await createTerminalJWT({
    terminalId: terminal.id,
    merchantId: terminal.merchant_id,
    termId: terminal.term_id,
    merchantKeyId: terminal.merchant_key_id ?? undefined,
  })

  // 로그인 시 status 갱신
  await supabase
    .from('terminals')
    .update({ status: 'online', last_seen_at: new Date().toISOString() })
    .eq('id', terminal.id)

  // 최신 설정 조회
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
    config: configRow?.config ?? null,
    configVersion: configRow?.version ?? 0,
  })
}
