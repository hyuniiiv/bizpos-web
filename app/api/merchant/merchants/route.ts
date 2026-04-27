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

  console.log('Merchants query result:', { count: merchants?.length || 0, error })

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
