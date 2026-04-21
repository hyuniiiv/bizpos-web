import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error'
import { generateSettlementExcel } from '@/lib/settlement/generateExcel'
import { generateSettlementPdf } from '@/lib/settlement/generatePdf'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)
  const { data: mu } = await supabase.from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const { data: settlement } = await supabase
    .from('settlements')
    .select('*')
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)
    .single()

  if (!settlement) return apiError('NOT_FOUND', '정산을 찾을 수 없습니다', 404)

  const { data: items } = await supabase
    .from('settlement_items')
    .select('*')
    .eq('settlement_id', id)
    .order('employee_no')

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  if (format === 'excel') {
    const buffer = await generateSettlementExcel(settlement, items ?? [])
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="settlement-${id}.xlsx"`,
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await generateSettlementPdf(settlement, items ?? [])
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="settlement-${id}.pdf"`,
      },
    })
  }

  return NextResponse.json({ data: settlement, items: items ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('UNAUTHORIZED', '인증이 필요합니다', 401)
  const { data: mu } = await supabase.from('merchant_users').select('merchant_id').eq('user_id', user.id).single()
  if (!mu) return apiError('MERCHANT_NOT_FOUND', '가맹점을 찾을 수 없습니다', 403)

  const body = await req.json()
  if (body.status !== 'confirmed') {
    return apiError('INVALID_ACTION', 'confirmed 상태로만 변경 가능합니다', 400)
  }

  const { data, error } = await supabase
    .from('settlements')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('merchant_id', mu.merchant_id)
    .eq('status', 'draft')
    .select()
    .single()

  if (error || !data) return apiError('NOT_FOUND_OR_CONFIRMED', '정산을 찾을 수 없거나 이미 확정됐습니다', 404)
  return NextResponse.json({ data })
}
