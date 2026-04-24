import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'

function generateActivationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  if (!merchantUser) return NextResponse.json({ error: 'MERCHANT_NOT_FOUND' }, { status: 403 })

  const { termId, name, corner, terminal_type, store_id } = await req.json()
  if (!termId || !store_id) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })

  // 권한 검증: store_id가 현재 merchant에 속하는지 확인
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('merchant_id', merchantUser.merchant_id)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'STORE_NOT_FOUND' }, { status: 403 })
  }

  const validTypes = ['ticket_checker', 'pos', 'kiosk', 'table_order']
  const { data, error } = await supabase.from('terminals').insert({
    merchant_id: merchantUser.merchant_id,
    store_id: store_id,
    term_id: String(termId).padStart(2, '0'),
    name: name ?? '',
    corner: corner ?? '',
    terminal_type: validTypes.includes(terminal_type) ? terminal_type : 'pos',
    activation_code: generateActivationCode(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// GET /api/terminals — POS 단말기 목록 조회 (terminal JWT 보호)
export async function GET(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('terminals')
    .select('id, term_id, name, corner, merchant_key_id, status')
    .order('term_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
