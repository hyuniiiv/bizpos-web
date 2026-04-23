import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { ClientSwitcher } from './ClientSwitcher'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const NAV = [
  { href: '/client/admin',             label: '대시보드' },
  { href: '/client/admin/clients',     label: '고객사 관리' },
  { href: '/client/admin/employees',   label: '사원 관리' },
  { href: '/client/admin/usages',      label: '식수 이력' },
  { href: '/client/admin/settlements', label: '정산' },
  { href: '/client/admin/members',     label: '권한 관리' },
]

export default async function ClientAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('client_users')
    .select('client_id, role, clients(client_name)')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')

  const isPlatformAdmin = membership.role === 'platform_client_admin'

  let effectiveClientId = membership.client_id
  if (isPlatformAdmin) {
    const cookieStore = await cookies()
    const selected = cookieStore.get('bp_selected_client')?.value
    if (selected) effectiveClientId = selected
  }

  let clientName: string | undefined
  if (effectiveClientId === membership.client_id) {
    const clientsData = membership.clients as unknown as { client_name: string } | null
    clientName = clientsData?.client_name
  } else {
    const { data: c } = await supabase
      .from('clients').select('client_name').eq('id', effectiveClientId).single()
    clientName = c?.client_name
  }

  return (
    <ProtectedRoute requiredRole="client">
    <div className="min-h-screen flex" style={{ background: 'var(--pos-bg-gradient)', color: 'var(--bp-text)' }}>
      <aside
        className="hidden md:flex flex-col md:w-16 lg:w-56 flex-shrink-0"
        style={{ background: 'var(--bp-surface)', borderRight: '1px solid var(--bp-border)' }}
      >
        <div className="px-3 py-4" style={{ borderBottom: '1px solid var(--bp-border)' }}>
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#06D6A0' }}>
              <span className="text-black font-black text-xs leading-none">C</span>
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-sm font-bold text-white leading-none">고객사 포털</p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
                {clientName ?? user.email}
              </p>
            </div>
          </div>
        </div>
        {isPlatformAdmin && <ClientSwitcher currentClientId={effectiveClientId} />}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.filter(item =>
            !(item.href === '/client/admin/members' && membership.role === 'client_operator')
          ).map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/signout" method="post" className="px-2 py-3"
          style={{ borderTop: '1px solid var(--bp-border)' }}>
          <button type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">로그아웃</span>
          </button>
        </form>
      </aside>
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
    </ProtectedRoute>
  )
}
