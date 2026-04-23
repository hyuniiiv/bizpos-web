import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'

/**
 * GET /api/menus
 * 단말기 초기 메뉴 목록 조회 (merchant 스코프)
 * 양방향 동기화용: updated_at 내림차순으로 반환
 */
export async function GET(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { merchantId } = auth.payload
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ menus: data ?? [] })
}
