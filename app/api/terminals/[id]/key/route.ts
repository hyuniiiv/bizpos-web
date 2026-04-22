import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'

// PUT /api/terminals/[id]/key — 단말기에 merchant_key 연결
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)

  const body = await req.json()
  const { merchantKeyId } = body  // null이면 연결 해제

  // 연결 요청 시 키 활성 여부 검증
  if (merchantKeyId) {
    const { data: key } = await supabase
      .from('merchant_keys')
      .select('is_active')
      .eq('id', merchantKeyId)
      .single()
    if (!key?.is_active) {
      return apiError('MERCHANT_KEY_INACTIVE', '비활성 상태의 가맹점 키는 연결할 수 없습니다', 400)
    }
  }

  const { data, error } = await supabase
    .from('terminals')
    .update({ merchant_key_id: merchantKeyId ?? null })
    .eq('id', id)
    .select('id, term_id, name, merchant_key_id')
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)
  return NextResponse.json(data)
}
