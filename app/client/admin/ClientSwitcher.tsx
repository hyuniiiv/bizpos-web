'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Client { id: string; client_name: string; biz_no: string }

export function ClientSwitcher({ currentClientId }: { currentClientId: string }) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/client/list')
      .then(r => r.json())
      .then(j => {
        const list: Client[] = j.data ?? []
        setClients(list)
        // 선택된 고객사 없고 1개뿐이면 자동 선택
        if (list.length === 1 && !currentClientId) {
          fetch('/api/portal/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'client', id: list[0].id }),
          }).then(() => router.refresh())
        }
      })
      .catch(() => {})
  }, [currentClientId, router])

  if (clients.length === 0) return null

  const current = clients.find(c => c.id === currentClientId) ?? clients[0]

  if (clients.length === 1) {
    return (
      <div className="px-2 py-3" style={{ borderBottom: '1px solid var(--bp-border)' }}>
        <div
          className="px-3 py-2 rounded-lg"
          style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
        >
          <div className="text-sm font-medium truncate text-white">{current.client_name}</div>
          <div className="text-xs" style={{ color: 'var(--bp-text-3)' }}>고객사</div>
        </div>
      </div>
    )
  }

  const handleSelect = async (id: string) => {
    setOpen(false)
    await fetch('/api/portal/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client', id }),
    })
    router.refresh()
  }

  return (
    <div className="px-2 py-3" style={{ borderBottom: '1px solid var(--bp-border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors"
        style={{
          background: 'var(--bp-surface-2)',
          color: 'var(--bp-text)',
          border: '1px solid var(--bp-border)',
        }}
      >
        <div className="truncate">{current.client_name}</div>
        <div className="text-xs" style={{ color: 'var(--bp-text-3)' }}>
          {clients.length}개 고객사
        </div>
      </button>

      {open && (
        <div
          className="mt-2 rounded-lg border overflow-hidden"
          style={{ background: 'var(--bp-surface-2)', borderColor: 'var(--bp-border)' }}
        >
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id)}
              className="w-full px-3 py-2 text-left text-sm transition-colors border-b last:border-b-0"
              style={{
                background: c.id === currentClientId ? 'var(--bp-accent)' : 'transparent',
                color: c.id === currentClientId ? '#000' : 'var(--bp-text)',
                borderColor: 'var(--bp-border)',
              }}
            >
              {c.client_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
