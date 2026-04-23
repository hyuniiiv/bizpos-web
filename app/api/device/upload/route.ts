import { NextRequest, NextResponse } from 'next/server'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// 단말기 원격 명령용 업로드 엔드포인트 (로그 / 스크린샷)
// Edge Runtime: Supabase Storage upload는 fetch 기반이라 Edge 호환.
// Vercel Edge 요청 본문 제한(~4.5MB) 초과 시 Node 런타임 전환 필요.
export const runtime = 'edge'
export const maxDuration = 30

const BUCKETS = {
  log: 'terminal-logs',
  screenshot: 'terminal-screenshots',
} as const
const EXTS: Record<keyof typeof BUCKETS, string> = { log: 'log', screenshot: 'png' }
const CONTENT_TYPES: Record<keyof typeof BUCKETS, string> = {
  log: 'text/plain',
  screenshot: 'image/png',
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function POST(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload
  const body = await request.json().catch(() => null) as
    | { kind?: 'log' | 'screenshot'; filename?: string; base64?: string }
    | null

  if (!body?.kind || !body.base64 || !(body.kind in BUCKETS)) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 })
  }

  const kind = body.kind as keyof typeof BUCKETS
  const bucket = BUCKETS[kind]
  const ext = EXTS[kind]
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const path = `${terminalId}/${ts}.${ext}`

  const bytes = decodeBase64ToBytes(body.base64)

  const supabase = createAdminClient()
  const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: CONTENT_TYPES[kind],
    upsert: false,
  })
  if (uploadErr) {
    return NextResponse.json({ error: 'UPLOAD_FAILED', detail: uploadErr.message }, { status: 500 })
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24)

  if (signErr) {
    return NextResponse.json({ path, signedUrl: null, warn: 'SIGN_URL_FAILED' })
  }

  return NextResponse.json({
    path,
    signedUrl: signed?.signedUrl ?? null,
    bucket,
    size: bytes.length,
  })
}
