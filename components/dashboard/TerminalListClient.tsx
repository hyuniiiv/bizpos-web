'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type TerminalType = 'ticket_checker' | 'pos' | 'kiosk' | 'table_order'

const TYPE_LABELS: Record<TerminalType, string> = {
  ticket_checker: '식권체크기',
  pos: 'POS',
  kiosk: 'KIOSK',
  table_order: '테이블 오더',
}

type Terminal = {
  id: string
  name: string | null
  term_id: string
  corner: string | null
  status: string
  terminal_type: TerminalType | null
  last_seen_at: string | null
  activation_code: string | null
  access_token: string | null
}

type Props = {
  initialTerminals: Terminal[]
  merchantId: string
}

export default function TerminalListClient({ initialTerminals, merchantId }: Props) {
  const [terminals, setTerminals] = useState<Terminal[]>(initialTerminals)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('terminals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'terminals', filter: `merchant_id=eq.${merchantId}` },
        async () => {
          const { data } = await supabase
            .from('terminals')
            .select('id, name, term_id, corner, status, terminal_type, last_seen_at, activation_code, access_token')
            .eq('merchant_id', merchantId)
            .order('term_id')
          if (data) setTerminals(data)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [merchantId])

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <tr>
            <th className="text-left px-4 py-3 text-white/50">ID</th>
            <th className="text-left px-4 py-3 text-white/50">이름</th>
            <th className="text-left px-4 py-3 text-white/50">타입</th>
            <th className="text-left px-4 py-3 text-white/50">코너</th>
            <th className="text-center px-4 py-3 text-white/50">상태</th>
            <th className="text-right px-4 py-3 text-white/50">마지막 접속</th>
            <th className="text-center px-4 py-3 text-white/50">활성화</th>
            <th className="text-right px-4 py-3 text-white/50">설정</th>
          </tr>
        </thead>
        <tbody>
          {terminals.map(t => (
            <tr key={t.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-mono text-white">{t.term_id}</td>
              <td className="px-4 py-3 text-white">{t.name || '-'}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/70">
                  {TYPE_LABELS[t.terminal_type as TerminalType] ?? 'POS'}
                </span>
              </td>
              <td className="px-4 py-3 text-white/50">{t.corner || '-'}</td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  t.status === 'online' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
                  {t.status === 'online' ? '온라인' : '오프라인'}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-white/40 text-xs">
                {t.last_seen_at ? new Date(t.last_seen_at).toLocaleString('ko-KR') : '미접속'}
              </td>
              <td className="px-4 py-3 text-center">
                {t.access_token ? (
                  <span className="text-xs text-green-400">완료</span>
                ) : (
                  <span className="font-mono text-xs text-yellow-300 px-2 py-0.5 rounded"
                        style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.30)' }}>
                    {t.activation_code}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/store/admin/terminals/${t.id}`} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                  설정 편집
                </Link>
              </td>
            </tr>
          ))}
          {!terminals.length && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                등록된 단말기가 없습니다. 단말기 추가 버튼을 눌러 시작하세요.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
