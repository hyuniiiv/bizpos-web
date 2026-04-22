import { NextRequest, NextResponse } from 'next/server'
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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  return NextResponse.json({ accessToken, expiresAt })
}
