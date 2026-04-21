import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const format = new URL(req.url).searchParams.get('format')

  const { data: settlement } = await supabase
    .from('settlements').select('*').eq('id', id).single()
  if (!settlement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: items } = await supabase
    .from('settlement_items').select('*').eq('settlement_id', id).order('employee_no')

  if (format === 'excel') {
    const { utils, write } = await import('xlsx')
    const sheetRows = (items ?? []).map(i => ({
      사원번호: i.employee_no,
      이름: i.employee_name,
      부서: i.department ?? '',
      조식: i.breakfast_count,
      중식: i.lunch_count,
      석식: i.dinner_count,
      합계: i.usage_count,
      금액: i.total_amount,
    }))
    const ws = utils.json_to_sheet(sheetRows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '정산')
    const buf = write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="settlement-${id}.xlsx"`,
      },
    })
  }

  return NextResponse.json({ data: settlement, items: items ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const { status } = await req.json() as { status: string }

  if (status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed is allowed' }, { status: 400 })
  }

  const { error } = await supabase
    .from('settlements')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
