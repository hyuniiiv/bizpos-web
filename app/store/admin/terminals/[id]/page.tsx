import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import PosConfigForm from './PosConfigForm'
import TerminalKeyPanel from './TerminalKeyPanel'
import CloneTerminalButton from './CloneTerminalButton'
import { UpdateCommandButton } from './UpdateCommandButton'

export const revalidate = 0

export default async function TerminalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('user_id', user.id)
    .single()

  // RLS 정책이 merchant_id 소유권 검증
  const { data: terminal } = await supabase
    .from('terminals')
    .select('id, term_id, name, corner, status, terminal_type, last_seen_at, activation_code, access_token, merchant_key_id, current_app_version, update_requested_at')
    .eq('id', id)
    .eq('merchant_id', merchantUser?.merchant_id)
    .single()

  if (!terminal) notFound()

  const [{ data: configRow }, { data: merchantKeys }] = await Promise.all([
    supabase
      .from('terminal_configs')
      .select('config, version')
      .eq('terminal_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('merchant_keys')
      .select('id, name, mid, is_active')
      .eq('merchant_id', merchantUser?.merchant_id)
      .order('created_at', { ascending: false }),
  ])

  const displayName = terminal.name || `단말기 ${terminal.term_id}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-white/50">
        <Link href="/store/admin/terminals" className="hover:text-white/80 transition-colors">단말기 관리</Link>
        <span>/</span>
        <span className="text-white/80 font-medium">{displayName}</span>
      </div>
      <h1 className="text-2xl font-bold text-white">{displayName} 설정</h1>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <PosConfigForm
            terminalId={id}
            initialConfig={configRow?.config ?? null}
            currentVersion={configRow?.version ?? 0}
            terminal={terminal}
          />
        </div>
        <div className="w-72 shrink-0 space-y-4">
          <TerminalKeyPanel
            terminalId={id}
            currentKeyId={terminal.merchant_key_id ?? null}
            merchantKeys={merchantKeys ?? []}
          />
          <div className="glass-card rounded-xl p-4 space-y-3" style={{ border: '1px solid rgba(96,165,250,0.30)' }}>
            <div>
              <p className="text-xs text-white/50 mb-1">앱 버전</p>
              <p className="text-sm font-semibold text-white">
                {terminal.current_app_version
                  ? <>v{terminal.current_app_version}</>
                  : <span className="text-white/40">미보고</span>}
              </p>
            </div>
            {terminal.update_requested_at && (
              <div>
                <p className="text-xs text-white/50 mb-1">마지막 업데이트 지시</p>
                <p className="text-xs text-blue-300">
                  {new Date(terminal.update_requested_at).toLocaleString('ko-KR')}
                </p>
              </div>
            )}
            <UpdateCommandButton terminalId={id} />
          </div>
          <CloneTerminalButton configJson={configRow?.config ?? null} />
        </div>
      </div>
    </div>
  )
}
