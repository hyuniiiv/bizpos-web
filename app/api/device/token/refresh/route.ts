import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import { createTerminalJWT } from '@/lib/terminal/jwt'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError } from '@/lib/api/error'

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  const { terminalId, merchantId, termId, merchantKeyId } = auth.payload

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

  // Decode exp from the actual issued token to prevent drift
  const secret = new TextEncoder().encode(process.env.TERMINAL_JWT_SECRET!)
  const { payload: issued } = await jwtVerify(accessToken, secret)
  const expiresAt = issued.exp ? new Date(issued.exp * 1000).toISOString() : null

  return NextResponse.json({ accessToken, expiresAt })
}
