import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AnomalyRule } from '@/types/supabase'

const VALID_RULES: AnomalyRule[] = ['duplicate_barcode', 'high_frequency', 'high_amount']

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'NO_MERCHANT' }, { status: 403 })

  const body = await req.json()
  const { rule, enabled, params } = body as { rule: AnomalyRule; enabled: boolean; params: Record<string, number> }

  if (!VALID_RULES.includes(rule)) {
    return NextResponse.json({ error: 'INVALID_RULE' }, { status: 400 })
  }

  const { error } = await supabase
    .from('anomaly_rule_settings')
    .upsert(
      { merchant_id: membership.merchant_id, rule, enabled, params },
      { onConflict: 'merchant_id,rule' }
    )

  if (error) return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
