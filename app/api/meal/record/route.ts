import { NextRequest, NextResponse } from 'next/server'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import { lookupEmployee } from '@/lib/meal/employeeLookup'
import { detectMealType } from '@/lib/meal/mealTypeDetector'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PeriodConfig } from '@/types/menu'

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error
  const { terminalId, merchantId } = auth.payload

  const body = await req.json()
  const { rawInput } = body as { rawInput: string }

  if (!rawInput) {
    return NextResponse.json({ error: 'rawInput required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 사원 조회 (card_number 또는 barcode)
  const lookup = await lookupEmployee(merchantId, rawInput)
  if (!lookup.found) {
    return NextResponse.json({ error: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
  }
  const { employee } = lookup

  // 고객사 중복 정책 조회
  const { data: merchant } = await supabase
    .from('merchants')
    .select('badge_settings')
    .eq('id', merchantId)
    .single()

  const dupPolicy: string =
    (merchant?.badge_settings as { dup_policy?: string } | null)?.dup_policy ??
    'block'

  // 단말기 설정에서 periods 조회
  const { data: configRow } = await supabase
    .from('terminal_configs')
    .select('config')
    .eq('terminal_id', terminalId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const periods: PeriodConfig[] =
    (configRow?.config as { periods?: PeriodConfig[] } | null)?.periods ?? []

  const mealType = detectMealType(periods)

  // 활성 메뉴에서 현재 mealType에 해당하는 금액 조회
  const menus: Array<{ mealType: string; paymentAmount: number; isActive: boolean }> =
    (configRow?.config as { menus?: Array<{ mealType: string; paymentAmount: number; isActive: boolean }> } | null)?.menus ?? []

  const matchedMenu = menus.find(m => m.isActive && m.mealType === mealType)
  const amount = matchedMenu?.paymentAmount ?? 0

  // 당일 동일 끼니 중복 체크
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: existing } = await supabase
    .from('meal_usages')
    .select('id')
    .eq('employee_id', employee.id)
    .eq('meal_type', mealType)
    .gte('used_at', todayStart.toISOString())
    .maybeSingle()

  if (existing) {
    if (dupPolicy === 'block') {
      return NextResponse.json({ error: 'DUPLICATE_BLOCKED' }, { status: 409 })
    }
    if (dupPolicy === 'warn') {
      // warn도 기록함 (관리자 추적 가능)
      await supabase.from('meal_usages').insert({
        merchant_id: merchantId,
        terminal_id: terminalId,
        employee_id: employee.id,
        meal_type: mealType,
        amount,
        synced: true,
      })
      return NextResponse.json({
        ok: true,
        warn: 'DUPLICATE_WARN',
        employee: { name: employee.name, department: employee.department },
        meal_type: mealType,
      })
    }
    // 'allow': 아래 INSERT로 진행
  }

  // meal_usages INSERT
  const { error: insertError } = await supabase
    .from('meal_usages')
    .insert({
      merchant_id: merchantId,
      terminal_id: terminalId,
      employee_id: employee.id,
      meal_type: mealType,
      amount,
      synced: true,
    })

  if (insertError) {
    console.error('[meal/record] insert error:', insertError)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    employee: { name: employee.name, department: employee.department },
    meal_type: mealType,
  })
}
