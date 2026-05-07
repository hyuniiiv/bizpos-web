import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

  // 모든 merchants 테이블 데이터 조회 (서비스 역할로)
  const { data: merchants, error } = await supabase
    .from('merchants')
    .select('*')
    .order('name')

  if (error) {
    console.error('Merchants query error:', error)
  }

  return NextResponse.json({ data: merchants ?? [] })
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

    if (!name || !biz_no || !address) {
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
          admin_id: admin_id || null,
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
    const { id, name, biz_no, address, admin_id, manager_id, description, is_active } = body

    if (!id) {
      return NextResponse.json({ error: '가맹점 ID가 필요합니다' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (biz_no !== undefined) updates.biz_no = biz_no
    if (address !== undefined) updates.address = address
    if (admin_id !== undefined) updates.admin_id = admin_id || null
    if (manager_id !== undefined) updates.manager_id = manager_id || null
    if (description !== undefined) updates.description = description || null
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await supabase
      .from('merchants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: unknown) {
    console.error('PATCH merchants error:', JSON.stringify(error))
    const message =
      error instanceof Error ? error.message :
      (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : '가맹점 수정 실패'
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

    const [{ count: storeCount }, { count: keyCount }, { count: memberCount }] = await Promise.all([
      supabase.from('stores').select('*', { count: 'exact', head: true }).eq('merchant_id', id),
      supabase.from('merchant_keys').select('*', { count: 'exact', head: true }).eq('merchant_id', id),
      supabase.from('merchant_users').select('*', { count: 'exact', head: true }).eq('merchant_id', id),
    ])
    if ((storeCount ?? 0) > 0)
      return NextResponse.json({ error: `매장 ${storeCount}개가 연결되어 있어 삭제할 수 없습니다` }, { status: 400 })
    if ((keyCount ?? 0) > 0)
      return NextResponse.json({ error: `가맹점 키 ${keyCount}개가 연결되어 있어 삭제할 수 없습니다` }, { status: 400 })
    if ((memberCount ?? 0) > 0)
      return NextResponse.json({ error: `계정 ${memberCount}개가 연결되어 있어 삭제할 수 없습니다` }, { status: 400 })

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
