import { createClient } from '@/lib/supabase/server'
import AddTerminalButton from './AddTerminalButton'
import TerminalsClient from './TerminalsClient'
import { redirect } from 'next/navigation'
import type { Role } from '@/lib/roles/permissions'

export const revalidate = 0

export default async function TerminalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id, role')
    .eq('user_id', user.id)
    .single()

  const merchantId = merchantUser?.merchant_id
  const userRole = (merchantUser?.role as Role | null) || null

  // Fetch terminals with store information
  const { data: terminals } = await supabase
    .from('terminals')
    .select('id, name, term_id, corner, status, terminal_type, last_seen_at, activation_code, access_token, went_offline_at, store_id')
    .eq('merchant_id', merchantId)
    .order('term_id')

  // Fetch stores for filtering
  const { data: stores } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('merchant_id', merchantId)
    .order('store_name')

  // For now, show all assigned stores - can be customized per user role
  const assignedStoreIds = (stores ?? []).map(s => s.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">단말기 관리</h1>
        <AddTerminalButton merchantId={merchantId} />
      </div>

      <TerminalsClient
        initialTerminals={terminals ?? []}
        merchantId={merchantId}
        stores={stores ?? []}
        userRole={userRole}
        assignedStoreIds={assignedStoreIds}
      />
    </div>
  )
}
