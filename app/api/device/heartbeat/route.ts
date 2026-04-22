import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import { verifyTerminalJWT } from '@/lib/terminal/jwt'

export async function POST(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload
  const { status } = await request.json().catch(() => ({ status: 'online' }))

  const supabase = createAdminClient()

  await supabase
    .from('terminals')
    .update({
      status: status ?? 'online',
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', terminalId)

  Promise.resolve(supabase.rpc('check_terminal_health')).then(() => {}).catch(() => {})

  const token = request.headers.get('Authorization')?.slice(7) ?? ''
  let tokenExpiresAt: string | null = null
  try {
    const payload = await verifyTerminalJWT(token)
    const exp = (payload as unknown as { exp?: number }).exp
    if (exp) tokenExpiresAt = new Date(exp * 1000).toISOString()
  } catch {
    // 만료 정보 없어도 heartbeat는 성공
  }

  return NextResponse.json({ ok: true, tokenExpiresAt })
}
