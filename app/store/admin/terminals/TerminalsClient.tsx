'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { canManageTerminalLifecycle } from '@/lib/roles/permissions'
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

function formatDuration(sinceIso: string): string {
  const ms = Date.now() - new Date(sinceIso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 경과`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 ${mins % 60}분 경과`
  const days = Math.floor(hours / 24)
  return `${days}일 ${hours % 24}시간 경과`
}

export default function TerminalsClient({
  initialTerminals,
  merchantId,
  stores,
  userRole,
  assignedStoreIds,
}: TerminalsClientProps) {
  const [terminals, setTerminals] = useState<Terminal[]>(initialTerminals)
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(assignedStoreIds)
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set())

  const canCrud = canManageTerminalLifecycle(userRole || '')

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

  const handleStoreToggle = (storeId: string) => {
    setSelectedStoreIds(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    )
  }

  const handleStoreExpand = (storeId: string) => {
    setExpandedStores(prev => {
      const next = new Set(prev)
      if (next.has(storeId)) {
        next.delete(storeId)
      } else {
        next.add(storeId)
      }
      return next
    })
  }

  // Filter terminals by selected stores
  const filteredTerminals = terminals.filter(t =>
    selectedStoreIds.includes(t.store_id || '')
  )

  // Group terminals by store
  const terminalsByStore = filteredTerminals.reduce((acc, terminal) => {
    const storeId = terminal.store_id || 'unknown'
    if (!acc[storeId]) acc[storeId] = []
    acc[storeId].push(terminal)
    return acc
  }, {} as Record<string, Terminal[]>)

  return (
    <div className="space-y-6">
      {/* 필터 섹션 */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">매장 필터</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {stores.map(store => (
            <label key={store.id} className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={selectedStoreIds.includes(store.id)}
                onChange={() => handleStoreToggle(store.id)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
              <span className="text-sm text-white">{store.store_name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 단말기 목록 (매장별 그룹) */}
      {selectedStoreIds.length === 0 ? (
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-white/50">매장을 선택하여 단말기를 확인하세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stores
            .filter(s => selectedStoreIds.includes(s.id))
            .map(store => {
              const storeTerminals = (terminalsByStore[store.id] || []).sort((a, b) =>
                (parseInt(a.term_id) || 0) - (parseInt(b.term_id) || 0)
              )
              const isExpanded = expandedStores.has(store.id)
              const onlineCount = storeTerminals.filter(t => t.status === 'online').length

              return (
                <div key={store.id} className="glass-card rounded-xl overflow-hidden">
                  {/* 아코디언 헤더 */}
                  <button
                    onClick={() => handleStoreExpand(store.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                      <div className="text-left">
                        <h4 className="font-semibold text-white">{store.store_name}</h4>
                        <p className="text-xs text-white/50">
                          {storeTerminals.length}개 단말기
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-green-400 font-medium">
                      {onlineCount}/{storeTerminals.length}
                    </span>
                  </button>

                  {/* 아코디언 컨텐츠 */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      {storeTerminals.length === 0 ? (
                        <div className="px-6 py-4 text-center text-white/50 text-sm">
                          등록된 단말기가 없습니다.
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                              <th className="text-left px-6 py-3 text-white/50">ID</th>
                              <th className="text-left px-6 py-3 text-white/50">이름</th>
                              <th className="text-left px-6 py-3 text-white/50">타입</th>
                              <th className="text-left px-6 py-3 text-white/50">코너</th>
                              <th className="text-center px-6 py-3 text-white/50">상태</th>
                              <th className="text-right px-6 py-3 text-white/50">액션</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storeTerminals.map((terminal, idx) => (
                              <tr
                                key={terminal.id}
                                className="border-t border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <td className="px-6 py-3 font-mono text-white">{terminal.term_id}</td>
                                <td className="px-6 py-3 text-white">{terminal.name || '-'}</td>
                                <td className="px-6 py-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/70">
                                    {TYPE_LABELS[terminal.terminal_type as TerminalType] ?? 'POS'}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-white/50">{terminal.corner || '-'}</td>
                                <td className="px-6 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    terminal.status === 'online'
                                      ? 'bg-green-500/20 text-green-300'
                                      : 'bg-white/10 text-white/40'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      terminal.status === 'online'
                                        ? 'bg-green-400 animate-pulse'
                                        : 'bg-white/30'
                                    }`} />
                                    {terminal.status === 'online' ? '온라인' : '오프라인'}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="flex gap-2 justify-end">
                                    {canCrud && (
                                      <button
                                        onClick={() => {}}
                                        className="text-orange-400 hover:text-orange-300 text-xs transition-colors"
                                        title="설정 편집"
                                      >
                                        [수정]
                                      </button>
                                    )}
                                    <Link
                                      href={`/store/admin/terminals/${terminal.id}`}
                                      className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                                    >
                                      [메뉴설정]
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
