import { NextResponse } from 'next/server'

/**
 * 에러 응답 헬퍼
 * 포맷: { error: string, message?: string }
 */
export function apiError(code: string, message?: string, status: number = 500) {
  const body: { error: string; message?: string } = { error: code }
  if (message) body.message = message
  return NextResponse.json(body, { status })
}
