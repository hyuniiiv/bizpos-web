import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mus } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)

  // platform_admin만 모든 가맹점 조회 가능
  const hasPlatformAdminRole = mus?.some(mu => mu.role === 'platform_admin')
  if (!hasPlatformAdminRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // merchant_users를 통해 merchants를 조회 (RLS 정책 우회)
  const { data: merchantUsers, error: muError } = await supabase
    .from('merchant_users')
    .select('merchant_id, merchants(*)')

  if (muError) {
    console.error('Merchant users query error:', muError)
    return NextResponse.json({ data: [] })
  }

  // 중복 제거하고 정렬
  const merchantMap = new Map()
  merchantUsers?.forEach(mu => {
    if (mu.merchants && !merchantMap.has(mu.merchants.id)) {
      merchantMap.set(mu.merchants.id, mu.merchants)
    }
  })

  const merchants = Array.from(merchantMap.values()).sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )

  return NextResponse.json({ data: merchants })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mus } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)

  const hasPlatformAdminRole = mus?.some(mu => mu.role === 'platform_admin')
  if (!hasPlatformAdminRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, biz_no, address, admin_id, manager_id, description } = body

    if (!name || !biz_no || !address || !admin_id) {
      return NextResponse.json(
        { error: '필수 항목을 입력하세요' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('merchants')
      .insert([
        {
          name,
          biz_no,
          address,
          admin_id,
          manager_id: manager_id || null,
          description: description || null,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '가맹점 생성 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mus } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)

  const hasPlatformAdminRole = mus?.some(mu => mu.role === 'platform_admin')
  if (!hasPlatformAdminRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, name, biz_no, address, admin_id, manager_id, description } = body

    if (!id) {
      return NextResponse.json({ error: '가맹점 ID가 필요합니다' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('merchants')
      .update({
        name,
        biz_no,
        address,
        admin_id,
        manager_id: manager_id || null,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : '가맹점 수정 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mus } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)

  const hasPlatformAdminRole = mus?.some(mu => mu.role === 'platform_admin')
  if (!hasPlatformAdminRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: '가맹점 ID가 필요합니다' }, { status: 400 })
    }

    const { error } = await supabase
      .from('merchants')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : '가맹점 삭제 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
