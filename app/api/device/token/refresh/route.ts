import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { createTerminalJWT } from '@/lib/terminal/jwt'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError } from '@/lib/api/error'
import type { TerminalJWTPayload } from '@/lib/terminal/jwt'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED', '인증 필요', 401)

  const token = authHeader.slice(7)
  const secret = new TextEncoder().encode(process.env.TERMINAL_JWT_SECRET!)

  let payload: TerminalJWTPayload
  try {
    // clockTolerance를 크게 설정해 만료된 토큰도 서명이 유효하면 갱신 허용
    const { payload: p } = await jwtVerify(token, secret, { clockTolerance: 999_999_999 })
    payload = p as unknown as TerminalJWTPayload
  } catch {
    return apiError('INVALID_TOKEN', '유효하지 않은 토큰', 401)
  }

  const { terminalId, merchantId, termId, merchantKeyId } = payload

  const supabase = createAdminClient()
  const { data: terminal } = await supabase
    .from('terminals')
    .select('status')
    .eq('id', terminalId)
    .single()

  if (!terminal || terminal.status === 'inactive') {
    return apiError('TERMINAL_INACTIVE', '비활성 단말기입니다', 403)
  }

  const accessToken = await createTerminalJWT({ terminalId, merchantId, termId, merchantKeyId })

  return NextResponse.json({ accessToken, expiresAt: null })
}
