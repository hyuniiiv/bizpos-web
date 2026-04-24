import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMerchantId } from '@/lib/merchant/getMerchantId'
import { MERCHANT_ASSIGNABLE as ASSIGNABLE, MERCHANT_PLATFORM_ROLES as PLATFORM_ROLES } from '@/lib/roles/assignable'
import { getEmailMapByIds } from '@/lib/supabase/emailMap'

async function getMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('merchant_users')
    .select('role, merchant_id')
    .eq('user_id', userId)
    .single()
  return data
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const storeId = url.searchParams.get('store_id')

  // store_id가 있으면 store 범위 멤버 조회
  if (storeId) {
    // store이 현재 merchant에 속하는지 확인
    const { data: store } = await supabase
      .from('stores')
      .select('id, merchant_id')
      .eq('id', storeId)
      .single()

    if (!store || (mu.role !== 'platform_admin' && store.merchant_id !== mu.merchant_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: members } = await supabase
      .from('store_managers')
      .select('id, user_id, created_at')
      .eq('store_id', storeId)
      .order('created_at')

    if (!members) return NextResponse.json({ data: [], storeId, myRole: mu.role })

    const emailMap = await getEmailMapByIds(members.map(m => m.user_id))
    const result = members.map(m => ({ ...m, email: emailMap[m.user_id] ?? '(알 수 없음)' }))

    return NextResponse.json({ data: result, storeId, myRole: mu.role })
  }

  // store_id 없으면 merchant 범위 멤버 조회 (기존 로직)
  let merchantId = url.searchParams.get('merchant_id')
  if (mu.role !== 'platform_admin' || !merchantId) {
    merchantId = await getMerchantId(supabase) ?? mu.merchant_id
  }

  const { data: members } = await supabase
    .from('merchant_users')
    .select('id, user_id, role, created_at')
    .eq('merchant_id', merchantId)
    .order('created_at')

  if (!members) return NextResponse.json({ data: [], merchantId, myRole: mu.role })

  const emailMap = await getEmailMapByIds(members.map(m => m.user_id))
  const result = members.map(m => ({ ...m, email: emailMap[m.user_id] ?? '(알 수 없음)' }))

  return NextResponse.json({ data: result, merchantId, myRole: mu.role })
}

// 시스템관리자는 이메일로 기존 계정 연결, 나머지는 ID/PW로 신규 생성
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu || ASSIGNABLE[mu.role]?.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!ASSIGNABLE[mu.role]?.includes(body.role)) {
    return NextResponse.json({ error: '해당 역할을 부여할 권한이 없습니다.' }, { status: 403 })
  }

  const merchantId = mu.role === 'platform_admin'
    ? (body.merchant_id ?? mu.merchant_id)
    : mu.merchant_id

  const admin = createAdminClient()
  let targetUserId: string

  if (PLATFORM_ROLES.has(body.role)) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = users.find(u => u.email === body.email)
    if (!existing) {
      return NextResponse.json({ error: '해당 이메일의 사용자를 찾을 수 없습니다. 먼저 회원가입이 필요합니다.' }, { status: 404 })
    }
    targetUserId = existing.id
  } else {
    if (!body.password) return NextResponse.json({ error: '비밀번호를 입력하세요.' }, { status: 400 })
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    })
    if (createErr) {
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const existing = users.find(u => u.email === body.email)
      if (!existing) {
        console.error('[merchant/members POST createUser]', createErr)
        return NextResponse.json({ error: '멤버 추가 중 오류가 발생했습니다.' }, { status: 500 })
      }
      targetUserId = existing.id
    } else {
      targetUserId = created.user!.id
    }
  }

  const { data, error } = await supabase
    .from('merchant_users')
    .insert({ merchant_id: merchantId, user_id: targetUserId, role: body.role })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '이미 등록된 사용자입니다.' }, { status: 409 })
    console.error('[merchant/members POST insert]', error)
    return NextResponse.json({ error: '멤버 추가 중 오류가 발생했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ data: { ...data, email: body.email } })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, role } = await req.json()
  if (!ASSIGNABLE[mu.role]?.includes(role)) {
    return NextResponse.json({ error: '해당 역할을 부여할 권한이 없습니다.' }, { status: 403 })
  }

  const { data: target } = await supabase.from('merchant_users').select('merchant_id, role').eq('id', id).single()
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (mu.role !== 'platform_admin' && target.merchant_id !== mu.merchant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!ASSIGNABLE[mu.role]?.includes(target.role)) {
    return NextResponse.json({ error: '해당 멤버를 수정할 권한이 없습니다.' }, { status: 403 })
  }

  // CRITICAL-1 defense: admin client로 UPDATE하여 RLS WITH CHECK 우회 (API 레이어에서 이미 인가 완료)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('merchant_users')
    .update({ role })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[merchant/members PATCH]', error)
    return NextResponse.json({ error: '역할 변경 중 오류가 발생했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mu = await getMembership(supabase, user.id)
  if (!mu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { data: target } = await supabase.from('merchant_users').select('merchant_id, user_id, role').eq('id', id).single()
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (mu.role !== 'platform_admin' && target.merchant_id !== mu.merchant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!ASSIGNABLE[mu.role]?.includes(target.role)) {
    return NextResponse.json({ error: '해당 멤버를 삭제할 권한이 없습니다.' }, { status: 403 })
  }
  if (target.user_id === user.id) {
    return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다.' }, { status: 400 })
  }

  const { error } = await supabase.from('merchant_users').delete().eq('id', id)
  if (error) {
    console.error('[merchant/members DELETE]', error)
    return NextResponse.json({ error: '멤버 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
