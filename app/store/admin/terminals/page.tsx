import { createClient } from '@/lib/supabase/server'
import AddTerminalButton from './AddTerminalButton'
import TerminalListClient from '@/components/dashboard/TerminalListClient'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function TerminalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  const merchantId = merchantUser?.merchant_id

  const { data: terminals } = await supabase
    .from('terminals')
    .select('id, name, term_id, corner, status, terminal_type, last_seen_at, activation_code, access_token')
    .eq('merchant_id', merchantId)
    .order('term_id')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">단말기 관리</h1>
        <AddTerminalButton merchantId={merchantId} />
      </div>

      <TerminalListClient
        initialTerminals={terminals ?? []}
        merchantId={merchantId}
      />
    </div>
  )
}
