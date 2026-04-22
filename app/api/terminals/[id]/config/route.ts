import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — 현재 최신 설정 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: mu } = await supabase
    .from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return NextResponse.json({ error: 'MERCHANT_NOT_FOUND' }, { status: 403 })

  // RLS 정책이 terminal_id → terminals.merchant_id → merchant_users 소유권 검증
  const { data } = await supabase
    .from('terminal_configs')
    .select('config, version, created_at')
    .eq('terminal_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json(data ?? { config: null, version: 0 })
}

// POST — 새 설정 버전 저장 (POS가 다음 폴링 시 수신)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: mu } = await supabase
    .from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return NextResponse.json({ error: 'MERCHANT_NOT_FOUND' }, { status: 403 })

  const config = await req.json()

  // 현재 최신 버전 조회
  const { data: latest } = await supabase
    .from('terminal_configs')
    .select('version')
    .eq('terminal_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (latest?.version ?? 0) + 1

  const { data, error } = await supabase
    .from('terminal_configs')
    .insert({
      terminal_id: id,
      config,
      version: nextVersion,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, version: nextVersion })
}
