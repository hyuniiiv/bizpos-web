import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: merchant })
  } catch (error) {
    const message = error instanceof Error ? error.message : '조회 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
