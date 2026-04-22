/**
 * 단말기 termId 기준으로 merchant_keys에서 3종 키를 조회해
 * BizplayClient 또는 MockBizplayClient를 반환하는 헬퍼
 */
import { BizplayClient, MockBizplayClient } from './bizplay'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getBizplayClientForTerminal(termId: string) {
  const supabase = createAdminClient()

  const { data: terminal } = await supabase
    .from('terminals')
    .select('merchant_key_id')
    .eq('term_id', termId)
    .single()

  if (!terminal?.merchant_key_id) {
    return new MockBizplayClient()
  }

  const { data: key } = await supabase
    .from('merchant_keys')
    .select('mid, enc_key, online_ak, env')
    .eq('id', terminal.merchant_key_id)
    .eq('is_active', true)
    .single()

  if (!key) {
    return new MockBizplayClient()
  }

  return new BizplayClient({
    mid: key.mid,
    encKey: key.enc_key,
    onlineAK: key.online_ak,
    env: key.env as 'production' | 'development',
  })
}
