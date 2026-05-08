import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getClientId } from '@/lib/client/getClientId'
import { UtensilsCrossed, Users } from 'lucide-react'

export default async function ClientAdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId = await getClientId(supabase)

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-white mb-2">고객사를 선택해 주세요</p>
          <p className="text-sm" style={{ color: 'var(--bp-text-3)' }}>
            좌측 상단의 고객사 선택 메뉴에서 관리할 고객사를 선택하세요.
          </p>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  const [{ count: todayCount }, { count: employeeCount }] = await Promise.all([
    supabase.from('meal_usages').select('*', { count: 'exact', head: true }).eq('client_id', clientId).gte('used_at', today),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('is_active', true),
  ])

  const stats = [
    { label: '오늘 태깅 수', value: (todayCount ?? 0).toLocaleString() + '건', color: '#06D6A0', Icon: UtensilsCrossed },
    { label: '활성 사원 수', value: (employeeCount ?? 0).toLocaleString() + '명', color: '#60a5fa', Icon: Users },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">대시보드</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>오늘의 식수 현황</p>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        {stats.map(({ label, value, color, Icon }) => (
          <div key={label} className="p-5 rounded-xl" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--bp-text-3)' }}>{label}</p>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
