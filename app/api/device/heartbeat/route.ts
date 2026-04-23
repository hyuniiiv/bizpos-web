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

  const finalStatus = status ?? 'online'
  await supabase
    .from('terminals')
    .update({
      status: finalStatus,
      last_seen_at: new Date().toISOString(),
      // online 복귀 시 offline 전환 기록 초기화 (다운타임 종료 시점은 last_seen_at으로 추적)
      ...(finalStatus === 'online' ? { went_offline_at: null } : {}),
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
