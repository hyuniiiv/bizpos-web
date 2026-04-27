import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import bcrypt from 'bcryptjs'

function generateActivationCode(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
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

  const { name, terminal_type, store_id } = await req.json()

  // store_id가 있으면 merchant 소속 검증
  if (store_id) {
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('merchant_id', merchantUser.merchant_id)
      .single()
    if (!store) return NextResponse.json({ error: 'STORE_NOT_FOUND' }, { status: 403 })
  }

  // 가맹점 내 최대 term_id 조회 → 다음 번호 자동 할당
  const { data: existing } = await supabase
    .from('terminals')
    .select('term_id')
    .eq('merchant_id', merchantUser.merchant_id)

  const maxTermId = Math.max(0, ...(existing ?? []).map(t => parseInt(t.term_id) || 0))
  const nextTermId = String(maxTermId + 1).padStart(2, '0')

  const validTypes = ['ticket_checker', 'pos', 'kiosk', 'table_order']
  const { data, error } = await supabase.from('terminals').insert({
    merchant_id: merchantUser.merchant_id,
    store_id: store_id ?? null,
    term_id: nextTermId,
    name: name ?? '',
    corner: '',
    terminal_type: validTypes.includes(terminal_type) ? terminal_type : 'pos',
    activation_code: generateActivationCode(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 기본 설정 저장 (초기 관리자 PIN: bcrypt 해시로 저장)
  const hashedPin = await bcrypt.hash('1234', 10)
  await supabase.from('terminal_configs').insert({
    terminal_id: data.id,
    config: { adminPin: hashedPin },
    version: 1,
  })

  return NextResponse.json({ ...data, initialPin: '1234' })
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
