'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import type { AnomalyAlert } from '@/types/supabase'

type AlertWithTerminal = AnomalyAlert & {
  terminals: { name: string; term_id: string } | null
}

const RULE_LABELS: Record<AnomalyAlert['rule'], string> = {
  duplicate_barcode: '중복 바코드',
  high_frequency: '고빈도 결제',
  high_amount: '고액 거래',
}

const SEVERITY_STYLES: Record<AnomalyAlert['severity'], string> = {
  HIGH:   'bg-red-500/20 text-red-300',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300',
  LOW:    'bg-white/10 text-white/60',
}

interface Props {
  alerts: AlertWithTerminal[]
  showAll: boolean
  readOnly?: boolean
}

export default function AlertsClient({ alerts, showAll, readOnly = false }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resolving, setResolving] = useState<string | null>(null)

  async function handleResolve(id: string) {
    setResolving(id)
    await fetch(`/api/alerts/${id}`, { method: 'PATCH' })
    setResolving(null)
    startTransition(() => router.refresh())
  }

  return (
    <div>
      {/* 탭 + 설정 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {([
            [false, '미확인'],
            [true,  '전체'],
          ] as [boolean, string][]).map(([isAll, label]) => (
            <button
              key={label}
              onClick={() => router.push(isAll ? '/store/admin/alerts?show=all' : '/store/admin/alerts')}
              className="px-4 py-1.5 rounded text-sm font-medium transition-all"
              style={showAll === isAll
                ? { background: 'rgba(96,165,250,0.30)', color: 'rgb(147,197,253)' }
                : { color: 'rgba(255,255,255,0.45)' }}
            >
              {label}
            </button>
          ))}
        </div>
        {!readOnly && (
          <Link
            href="/store/admin/alerts/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">규칙 설정</span>
          </Link>
        )}
      </div>

      {/* 알림 목록 */}
      {alerts.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-white/40 text-base">
          {showAll ? '알림 내역이 없습니다.' : '미확인 알림이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`glass-card rounded-lg p-4 flex items-start justify-between gap-4 ${
                alert.resolved ? 'opacity-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_STYLES[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  <span className="text-base font-medium text-white">
                    {RULE_LABELS[alert.rule]}
                  </span>
                </div>
                <p className="text-sm text-white/50 mb-1">
                  단말기: {alert.terminals?.name ?? alert.terminals?.term_id ?? '-'}
                </p>
                {alert.detail && (
                  <p className="text-sm text-white/40 truncate">
                    {JSON.stringify(alert.detail)}
                  </p>
                )}
                <p className="text-sm text-white/40 mt-1">
                  {new Date(alert.created_at).toLocaleString('ko-KR')}
                  {alert.resolved && alert.resolved_at && (
                    <span className="ml-2 text-green-400">
                      처리완료 ({new Date(alert.resolved_at).toLocaleString('ko-KR')})
                    </span>
                  )}
                </p>
              </div>
              {!alert.resolved && !readOnly && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolving === alert.id || pending}
                  className="flex-shrink-0 px-3 py-2 text-sm rounded-lg text-green-300 hover:text-green-200 disabled:opacity-50 transition-colors"
                  style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.30)' }}
                >
                  {resolving === alert.id ? '처리 중...' : '처리 완료'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
