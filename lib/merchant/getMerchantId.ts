import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function getMerchantId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('merchant_users')
    .select('merchant_id, role')
    .eq('user_id', user.id)
    .single()
  if (!data) return null

  if (data.role === 'platform_store_admin') {
    const cookieStore = await cookies()
    const selected = cookieStore.get('bp_selected_merchant')?.value
    if (selected) {
      // CRITICAL-2: 쿠키 값이 실제 존재하는 merchant인지 DB에서 검증
      const { data: exists } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('merchant_id', selected)
        .limit(1)
        .maybeSingle()
      if (exists) return selected
    }
  }

  return data.merchant_id
}
