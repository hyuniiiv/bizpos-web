import { NextRequest, NextResponse } from 'next/server'
import { verifyTerminalJWT, TerminalJWTPayload } from './jwt'

export async function requireTerminalAuth(
  request: NextRequest
): Promise<{ payload: TerminalJWTPayload } | { error: NextResponse }> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    }
  }
  try {
    const payload = await verifyTerminalJWT(auth.slice(7))
    return { payload }
  } catch {
    return {
      error: NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 }),
    }
  }
}
