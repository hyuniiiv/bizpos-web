import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function getClientId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('client_users')
    .select('client_id, role')
    .eq('user_id', user.id)
    .single()
  if (!data) return null

  if (data.role === 'platform_client_admin') {
    const cookieStore = await cookies()
    const selected = cookieStore.get('bp_selected_client')?.value
    if (selected) {
      // CRITICAL-2: 쿠키 값이 실제 존재하는 client인지 DB에서 검증
      const { data: exists } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('client_id', selected)
        .limit(1)
        .maybeSingle()
      if (exists) return selected
    }
  }

  return data.client_id
}
