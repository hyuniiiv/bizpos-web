/**
 * 단말기 termId 기준으로 merchant_keys에서 3종 키를 조회해
 * BizplayClient를 반환하는 헬퍼.
 * 키가 없거나 비활성이면 에러를 throw한다 — MockBizplayClient 무음 폴백 금지.
 */
import { BizplayClient, MockBizplayClient } from './bizplay'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getBizplayClientForTerminal(termId: string) {
  const isDev = process.env.NODE_ENV === 'development'

  const supabase = createAdminClient()

  const { data: terminal } = await supabase
    .from('terminals')
    .select('merchant_key_id')
    .eq('term_id', termId)
    .single()

  if (!terminal?.merchant_key_id) {
    if (isDev) return new MockBizplayClient()
    throw new Error(
      `Terminal '${termId}' has no merchant key configured. Assign a merchant key before processing payments.`
    )
  }

  const { data: key } = await supabase
    .from('merchant_keys')
    .select('mid, enc_key, online_ak, env')
    .eq('id', terminal.merchant_key_id)
    .eq('is_active', true)
    .single()

  if (!key) {
    if (isDev) return new MockBizplayClient()
    throw new Error(
      `Merchant key '${terminal.merchant_key_id}' not found or inactive for terminal '${termId}'.`
    )
  }

  return new BizplayClient({
    mid: key.mid,
    encKey: key.enc_key,
    onlineAK: key.online_ak,
    env: key.env as 'production' | 'development',
  })
}
