'use client'

interface Terminal {
  id: string
  name: string
  term_id: string
  status: 'online' | 'offline'
}

const STATUS_STYLES = {
  online: { background: 'rgba(16,185,129,0.12)', color: '#10b981', label: '온라인' },
  offline: { background: 'rgba(107,114,128,0.12)', color: '#6b7280', label: '오프라인' },
}

const TABLE_STYLE = {
  wrapper: { background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' },
  border: { borderBottom: '1px solid var(--bp-border)' },
}

export default function TerminalListClient({
  initialTerminals,
  merchantId,
}: {
  initialTerminals: Terminal[]
  merchantId: string
}) {
  return (
    <div>
      <div className="rounded-xl overflow-hidden" style={TABLE_STYLE.wrapper}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ ...TABLE_STYLE.border, color: 'var(--bp-text-3)' }}>
              <th className="text-left px-4 py-3 font-medium">단말기명</th>
              <th className="text-left px-4 py-3 font-medium">번호</th>
              <th className="text-left px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {initialTerminals.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12" style={{ color: 'var(--bp-text-3)' }}>
                  단말기가 없습니다.
                </td>
              </tr>
            ) : (
              initialTerminals.map(terminal => {
                const statusStyle = STATUS_STYLES[terminal.status]
                return (
                  <tr key={terminal.id} style={TABLE_STYLE.border}>
                    <td className="px-4 py-3 text-white">{terminal.name}</td>
                    <td className="px-4 py-3 text-white">{terminal.term_id}</td>
                    <td className="px-4 py-3">
                      <div
                        role="status"
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ background: statusStyle.background, color: statusStyle.color }}
                      >
                        {statusStyle.label}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
