import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id, role, merchants(name, biz_no)')
    .eq('user_id', user.id)
    .single()

  const merchant = merchantUser?.merchants as unknown as { name: string; biz_no: string } | null

  return (
    <div className="space-y-6 w-full max-w-2xl lg:max-w-4xl">
      <h1 className="text-2xl font-bold text-white">설정</h1>

      {/* 계정 정보 */}
      <section className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 border-b border-white/10 pb-2">계정 정보</h2>
        <div className="grid grid-cols-2 gap-y-3 text-base">
          <span className="text-white/50">이메일</span>
          <span className="text-white">{user?.email}</span>
          <span className="text-white/50">권한</span>
          <span className="text-white capitalize">{merchantUser?.role ?? '-'}</span>
        </div>
      </section>

      {/* 가맹점 정보 */}
      <section className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 border-b border-white/10 pb-2">가맹점 정보</h2>
        {merchant ? (
          <div className="grid grid-cols-2 gap-y-3 text-base">
            <span className="text-white/50">가맹점명</span>
            <span className="text-white">{merchant.name}</span>
            <span className="text-white/50">사업자번호</span>
            <span className="text-white">{merchant.biz_no || '-'}</span>
            <span className="text-white/50">가맹점 ID</span>
            <span className="font-mono text-sm text-white/40">{merchantUser?.merchant_id}</span>
          </div>
        ) : (
          <p className="text-base text-white/40">가맹점 정보를 불러올 수 없습니다.</p>
        )}
      </section>

      {/* 연동 정보 */}
      <section className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 border-b border-white/10 pb-2">단말기 연동</h2>
        <div className="text-base text-white/50 space-y-1">
          <p>단말기 등록 및 활성화 코드는 <strong className="text-white/80">단말기 관리</strong> 페이지에서 확인하세요.</p>
          <p className="text-sm text-white/35 pt-1">
            단말기는 활성화 코드를 입력하면 자동으로 JWT 토큰을 발급받아 연결됩니다.
          </p>
        </div>
      </section>

    </div>
  )
}
