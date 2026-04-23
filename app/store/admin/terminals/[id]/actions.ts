'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function requestTerminalUpdate(terminalId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다')

  const admin = createAdminClient()
  const { error } = await admin
    .from('terminals')
    .update({ update_requested_at: new Date().toISOString() })
    .eq('id', terminalId)

  if (error) throw new Error(error.message)
}
