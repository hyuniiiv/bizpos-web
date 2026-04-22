import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Store, Building } from 'lucide-react'

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: mu }, { data: cu }] = await Promise.all([
    supabase.from('merchant_users').select('merchant_id').eq('user_id', user.id).single(),
    supabase.from('client_users').select('client_id').eq('user_id', user.id).single(),
  ])

  if (!mu && !cu) redirect('/unauthorized')
  if (mu && !cu) redirect('/store/admin')
  if (!mu && cu) redirect('/client/admin')

  // 양쪽 다 있는 경우 — 선택 화면
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'var(--pos-bg-gradient)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#06D6A0' }}>
              <span className="text-black font-black text-base leading-none">B</span>
            </div>
            <span className="text-3xl font-black tracking-tight text-white">BIZPOS</span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--bp-text-3)' }}>접속할 포털을 선택하세요</p>
        </div>

        <div className="space-y-3">
          <Link href="/store/admin"
            className="flex items-center gap-4 w-full p-5 rounded-2xl text-left transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(6,214,160,0.12)' }}>
              <Store className="w-5 h-5" style={{ color: '#06D6A0' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">매장 포털</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>단말기·거래·매장 관리</p>
            </div>
          </Link>

          <Link href="/client/admin"
            className="flex items-center gap-4 w-full p-5 rounded-2xl text-left transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(96,165,250,0.12)' }}>
              <Building className="w-5 h-5" style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">고객사 포털</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>사원·식수·정산 관리</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
