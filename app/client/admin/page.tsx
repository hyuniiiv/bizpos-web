import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientAdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cu } = await supabase
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()
  if (!cu) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ count: todayCount }, { count: employeeCount }] = await Promise.all([
    supabase
      .from('meal_usages')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', cu.client_id)
      .gte('used_at', today),
    supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', cu.client_id)
      .eq('is_active', true),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">식수 현황</h1>
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="p-4 bg-gray-800 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">오늘 태깅 수</p>
          <p className="text-3xl font-bold">{(todayCount ?? 0).toLocaleString()}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">활성 사원 수</p>
          <p className="text-3xl font-bold">{(employeeCount ?? 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
