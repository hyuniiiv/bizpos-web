import { NextRequest } from 'next/server'
import { transactionEmitter } from '../../payment/approve/route'
import { requireTerminalAuth } from '@/lib/terminal/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  const sessionId = crypto.randomUUID()
  const encoder = new TextEncoder()
  const port = process.env.PORT || '3000'
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? `http://127.0.0.1:${port}`

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      const listeners = transactionEmitter.get(sessionId) ?? []
      const onTransaction = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // 클라이언트 연결 종료 시 무시
        }
      }
      listeners.push(onTransaction)
      transactionEmitter.set(sessionId, listeners)

      req.signal.addEventListener('abort', () => {
        transactionEmitter.delete(sessionId)
        try { controller.close() } catch { /* 이미 닫힘 */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': allowedOrigin,
    },
  })
}
