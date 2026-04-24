import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  // platform_admin만 모든 가맹점 조회 가능
  if (!mu || mu.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, name, registration_number, address, admin_id, manager_id, description')
    .order('name')

  return NextResponse.json({ data: merchants ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!mu || mu.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, registration_number, address, admin_id, manager_id, description } = body

    if (!name || !registration_number || !address || !admin_id) {
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
          registration_number,
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

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!mu || mu.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, name, registration_number, address, admin_id, manager_id, description } = body

    if (!id) {
      return NextResponse.json({ error: '가맹점 ID가 필요합니다' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('merchants')
      .update({
        name,
        registration_number,
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

  const { data: mu } = await supabase
    .from('merchant_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!mu || mu.role !== 'platform_admin') {
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
