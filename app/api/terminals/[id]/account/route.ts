import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'
import bcrypt from 'bcryptjs'

/**
 * PUT /api/terminals/[id]/account — 단말기 계정 설정 (terminal_account_id + 비밀번호)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const body = await req.json()
  const { terminalAccountId, password } = body

  if (!terminalAccountId || !password) {
    return apiError('MISSING_FIELDS', 'terminalAccountId, password 필드가 필요합니다', 400)
  }

  const hash = await bcrypt.hash(password, 12)

  const { data, error } = await supabase
    .from('terminals')
    .update({
      terminal_account_id: terminalAccountId,
      terminal_account_hash: hash,
    })
    .eq('id', id)
    .select('id, term_id, name, terminal_account_id')
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)
  return NextResponse.json(data)
}
