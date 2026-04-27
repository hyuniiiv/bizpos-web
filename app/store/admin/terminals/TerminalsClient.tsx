'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/roles/permissions'

type TerminalType = 'ticket_checker' | 'pos' | 'kiosk' | 'table_order'

const TYPE_LABELS: Record<TerminalType, string> = {
  ticket_checker: '식권체크기',
  pos: 'POS',
  kiosk: 'KIOSK',
  table_order: '테이블 오더',
}

interface Terminal {
  id: string
  name: string | null
  term_id: string
  corner: string | null
  status: string
  terminal_type: TerminalType | null
  last_seen_at: string | null
  activation_code: string | null
  access_token: string | null
  went_offline_at: string | null
  store_id: string | null
}

interface Store {
  id: string
  store_name: string
}

interface TerminalsClientProps {
  initialTerminals: Terminal[]
  merchantId: string
  stores: Store[]
  userRole: Role | null
  assignedStoreIds: string[]
}

export default function TerminalsClient({
  initialTerminals,
  merchantId,
  stores,
  assignedStoreIds,
}: TerminalsClientProps) {
  const router = useRouter()
  const [terminals, setTerminals] = useState<Terminal[]>(initialTerminals)

  const storeMap = new Map(stores.map(s => [s.id, s.store_name]))

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
            .select('id, name, term_id, corner, status, terminal_type, last_seen_at, activation_code, access_token, went_offline_at, store_id')
            .eq('merchant_id', merchantId)
            .order('term_id')
          if (data) setTerminals(data)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [merchantId])

  // store_id 없는 미배정 단말기도 포함하여 전체 표시
  const visibleTerminals = terminals
    .sort((a, b) => {
      const storeA = storeMap.get(a.store_id || '') ?? '￿'
      const storeB = storeMap.get(b.store_id || '') ?? '￿'
      if (storeA !== storeB) return storeA.localeCompare(storeB)
      return (parseInt(a.term_id) || 0) - (parseInt(b.term_id) || 0)
    })

  const onlineCount = visibleTerminals.filter(t => t.status === 'online').length

  return (
    <div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bp-border)', color: 'var(--bp-text-3)' }}>
              <th className="text-left px-4 py-3 font-medium">단말기 ID</th>
              <th className="text-left px-4 py-3 font-medium">이름</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">매장</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">타입</th>
              <th className="text-left px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {visibleTerminals.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12" style={{ color: 'var(--bp-text-3)' }}>
                  등록된 단말기가 없습니다.
                </td>
              </tr>
            ) : (
              visibleTerminals.map(terminal => (
                <tr
                  key={terminal.id}
                  style={{ borderBottom: '1px solid var(--bp-border)' }}
                >
                  <td className="px-4 py-3 font-mono font-medium text-white">
                    {terminal.term_id}
                  </td>
                  <td
                    className="px-4 py-3 text-white font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => router.push(`/store/admin/terminals/${terminal.id}`)}
                  >
                    {terminal.name || terminal.term_id}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--bp-text-3)' }}>
                    {storeMap.get(terminal.store_id || '') ?? '-'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'var(--bp-surface-2)', color: 'var(--bp-text-3)' }}
                    >
                      {TYPE_LABELS[terminal.terminal_type as TerminalType] ?? 'POS'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      terminal.status === 'online'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        terminal.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                      }`} />
                      {terminal.status === 'online' ? '온라인' : '오프라인'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
