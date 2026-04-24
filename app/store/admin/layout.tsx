import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SideNav, MobileNav } from './NavItem'
import LogoutButton from './LogoutButton'
import { MerchantSwitcher } from './MerchantSwitcher'
import { StoreSwitcher } from './StoreSwitcher'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { StoreProvider } from '@/lib/context/StoreContext'
import type { Store } from '@/lib/context/StoreContext'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('merchant_users')
    .select('merchant_id, role')
    .eq('user_id', user.id)
    .single()

  const isPlatformAdmin = membership?.role === 'platform_admin'

  const cookieStore = await cookies()

  let effectiveMerchantId = membership?.merchant_id ?? ''
  if (isPlatformAdmin) {
    const selected = cookieStore.get('bp_selected_merchant')?.value
    if (selected) effectiveMerchantId = selected
  }

  // stores 데이터 fetch
  const { data: stores = [] } = await supabase
    .from('stores')
    .select('id, merchant_id, store_name, is_active')
    .eq('merchant_id', effectiveMerchantId)
    .order('store_name')

  const savedStoreId = cookieStore.get('bp_selected_store')?.value
  const initialStoreId = stores.find(s => s.id === savedStoreId)?.id || stores[0]?.id || null

  let alertCount = 0
  if (effectiveMerchantId) {
    const { count } = await supabase
      .from('anomaly_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', effectiveMerchantId)
      .eq('resolved', false)
    alertCount = count ?? 0
  }

  return (
    <StoreProvider initialStoreId={initialStoreId} initialStores={stores as Store[]}>
      <ProtectedRoute requiredRole="merchant">
      <div className="min-h-screen flex" style={{ background: 'var(--pos-bg-gradient)' }}>

        {/* 사이드바: md 이상 */}
        <aside
          className="hidden md:flex flex-col md:w-16 lg:w-56 flex-shrink-0"
          style={{ background: 'var(--bp-surface)', borderRight: '1px solid var(--bp-border)' }}
        >
          <div className="px-3 py-4" style={{ borderBottom: '1px solid var(--bp-border)' }}>
            <div className="flex items-center gap-2.5 px-1">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#06D6A0' }}
              >
                <span className="text-black font-black text-xs leading-none">B</span>
              </div>
              <div className="hidden lg:block min-w-0">
                <p className="text-sm font-bold text-white leading-none">BIZPOS</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--bp-text-3)' }}>{user.email}</p>
              </div>
            </div>
          </div>
          {isPlatformAdmin && <MerchantSwitcher currentMerchantId={effectiveMerchantId} />}
          <StoreSwitcher />
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            <SideNav alertCount={alertCount} myRole={membership?.role} />
          </nav>
          <div className="px-2 py-3" style={{ borderTop: '1px solid var(--bp-border)' }}>
            <LogoutButton />
          </div>
        </aside>

        {/* 메인 컨테이너 */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* 모바일 상단 헤더 + 수평 네비 */}
          <div
            className="md:hidden"
            style={{ background: 'var(--bp-surface)', borderBottom: '1px solid var(--bp-border)' }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#06D6A0' }}>
                  <span className="text-black font-black text-xs leading-none">B</span>
                </div>
                <p className="text-sm font-bold text-white">BIZPOS</p>
              </div>
              <p className="text-xs truncate max-w-[140px]" style={{ color: 'var(--bp-text-3)' }}>{user.email}</p>
            </div>
            <nav className="flex overflow-x-auto gap-1 px-2 pb-2 scrollbar-none">
              <MobileNav alertCount={alertCount} myRole={membership?.role} />
            </nav>
          </div>

          {/* 콘텐츠 영역 */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
        </div>
      </div>
      </ProtectedRoute>
    </StoreProvider>
  )
}
