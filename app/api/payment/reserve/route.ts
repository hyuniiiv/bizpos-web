import { NextRequest, NextResponse } from 'next/server'
import { BizplayClient, MockBizplayClient } from '@/lib/payment/bizplay'
import { generateOrderId } from '@/lib/payment/order'
import type { ReserveRequest } from '@/types/payment'
import { requireTerminalAuth } from '@/lib/terminal/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  const t0 = Date.now()
  try {
    const body = await req.json() as ReserveRequest & {
      env?: 'production' | 'development'
      onlineAK?: string
      merchantId?: string
    }

    // JWT에서 검증된 termId/merchantId 사용 (바디 값 신뢰 금지)
    const termId = auth.payload.termId
    const merchantId = auth.payload.merchantId

    // 사업자번호는 항상 서버 권위 — merchants.biz_no를 조회해 productItems[].biz_no 강제 주입
    let merchantBizNo: string | null = null
    if (merchantId) {
      const supabase = createAdminClient()
      const { data: merchant } = await supabase
        .from('merchants')
        .select('biz_no')
        .eq('id', merchantId)
        .single()
      merchantBizNo = merchant?.biz_no ?? null
    }
    if (!merchantBizNo) {
      console.error(`[reserve] missing_biz_no: merchantId=${merchantId ?? 'none'} termId=${termId ?? 'none'}`)
      return NextResponse.json({ code: 'C003', msg: '가맹점 사업자번호가 설정되지 않았습니다.' }, { status: 400 })
    }
    if (Array.isArray(body.productItems)) {
      body.productItems = body.productItems.map(item => ({ ...item, biz_no: merchantBizNo as string }))
    }
    let client
    if (termId) {
      const { getBizplayClientForTerminal } = await import('@/lib/payment/getBizplayClient')
      client = await getBizplayClientForTerminal(termId)
    } else if (process.env.BIZPLAY_MID) {
      client = new BizplayClient({
        mid: process.env.BIZPLAY_MID,
        encKey: process.env.BIZPLAY_ENC_KEY!,
        onlineAK: process.env.BIZPLAY_ONLINE_AK!,
        env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      })
    } else {
      client = new MockBizplayClient()
    }

    const tBizplay = Date.now()
    const result = await client.reserve(body)
    const totalMs = Date.now() - t0
    const bizplayMs = Date.now() - tBizplay
    console.log(`[reserve-timing] total=${totalMs}ms bizplay=${bizplayMs}ms termId=${termId ?? 'none'} code=${result.code ?? '?'}`)
    if (!result.code) {
      // BizPlay 응답에 code 필드가 없음 — 진단을 위해 키/원문 로깅
      const resultKeys = result && typeof result === 'object' ? Object.keys(result) : []
      const snippet = (() => { try { return JSON.stringify(result).slice(0, 400) } catch { return '[unserializable]' } })()
      console.error(`[reserve] missing code: termId=${termId ?? 'none'} keys=${resultKeys.join(',')} body=${snippet}`)
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error(`[reserve] Error: termId=${auth.payload.termId ?? 'none'} error=${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json({ code: 'C002', msg: '서버 오류' }, { status: 500 })
  }
}
