import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'

/**
 * PATCH /api/menus/:id
 * 메뉴 업서트 (양방향 동기화)
 * LWW(Last-Write-Wins): payload.updated_at 가 DB 현재 값보다 과거면 거부
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { merchantId } = auth.payload
  const { id } = await params

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. 현재 DB 상태 조회
  const { data: current } = await supabase
    .from('menus')
    .select('*')
    .eq('id', id)
    .eq('merchant_id', merchantId)
    .maybeSingle()

  // 2. Stale write 체크 (epoch ms 비교)
  const incomingUpdatedAt =
    typeof payload.updated_at === 'number' ? payload.updated_at : Date.now()

  if (
    current &&
    typeof current.updated_at === 'number' &&
    incomingUpdatedAt < current.updated_at
  ) {
    return NextResponse.json({
      applied: false,
      current,
      reason: 'stale',
    })
  }

  // 3. Upsert (없으면 insert, 있으면 update) — merchant_id 강제 귀속
  const { data, error } = await supabase
    .from('menus')
    .upsert({
      ...payload,
      id,
      merchant_id: merchantId,
      updated_at: incomingUpdatedAt,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applied: true, menu: data })
}

/**
 * DELETE /api/menus/:id
 * 메뉴 삭제 (양방향 동기화)
 * 클라이언트의 X-Updated-At 헤더가 DB 현재 updated_at 보다 과거면 삭제 거부
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { merchantId } = auth.payload
  const { id } = await params

  const updatedAtHeader = request.headers.get('X-Updated-At')
  const parsed = updatedAtHeader ? parseInt(updatedAtHeader, 10) : NaN
  const clientUpdatedAt = Number.isFinite(parsed) ? parsed : Date.now()

  const supabase = createAdminClient()

  // Stale check: DB 현재 값이 더 최신이면 삭제 거부
  const { data: current } = await supabase
    .from('menus')
    .select('updated_at')
    .eq('id', id)
    .eq('merchant_id', merchantId)
    .maybeSingle()

  if (
    current &&
    typeof current.updated_at === 'number' &&
    clientUpdatedAt < current.updated_at
  ) {
    return NextResponse.json({ applied: false, reason: 'stale' })
  }

  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', id)
    .eq('merchant_id', merchantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applied: true })
}
