import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChangePasswordForm from './ChangePasswordForm'

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
      <h1 className="text-2xl font-bold text-white">내 계정</h1>

      {/* 계정 정보 */}
      <section className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 border-b border-white/10 pb-2">계정 정보</h2>
        <div className="grid grid-cols-2 gap-y-3 text-base">
          <span className="text-white/50">이메일</span>
          <span className="text-white">{user?.email}</span>
          <span className="text-white/50">권한</span>
          <span className="text-white capitalize">{merchantUser?.role ?? '-'}</span>
          {merchant && (
            <>
              <span className="text-white/50">소속 가맹점</span>
              <span className="text-white">{merchant.name}</span>
            </>
          )}
        </div>
      </section>

      {/* 비밀번호 변경 */}
      <section className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 border-b border-white/10 pb-2">비밀번호 변경</h2>
        <ChangePasswordForm />
      </section>

      {/* 가맹점 정보 */}
      {merchant && (
        <section className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white/80 border-b border-white/10 pb-2">가맹점 정보</h2>
          <div className="grid grid-cols-2 gap-y-3 text-base">
            <span className="text-white/50">가맹점명</span>
            <span className="text-white">{merchant.name}</span>
            <span className="text-white/50">사업자번호</span>
            <span className="text-white">{merchant.biz_no || '-'}</span>
            <span className="text-white/50">가맹점 ID</span>
            <span className="font-mono text-sm text-white/40">{merchantUser?.merchant_id}</span>
          </div>
        </section>
      )}
    </div>
  )
}
