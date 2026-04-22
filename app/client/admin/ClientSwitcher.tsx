'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Client { id: string; client_name: string; biz_no: string }

export function ClientSwitcher({ currentClientId }: { currentClientId: string }) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    fetch('/api/client/list')
      .then(r => r.json())
      .then(j => setClients(j.data ?? []))
      .catch(() => {})
  }, [])

  if (clients.length <= 1) return null

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await fetch('/api/portal/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client', id: e.target.value }),
    })
    router.refresh()
  }

  return (
    <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--bp-border)' }}>
      <p className="text-xs mb-1.5" style={{ color: 'var(--bp-text-3)' }}>고객사 선택</p>
      <select
        value={currentClientId}
        onChange={handleChange}
        className="w-full px-2 py-1.5 text-xs rounded"
        style={{
          background: 'var(--bp-surface-2)',
          border: '1px solid var(--bp-border)',
          color: 'var(--bp-text)',
        }}
      >
        {clients.map(c => (
          <option key={c.id} value={c.id} style={{ background: '#1e2533' }}>
            {c.client_name}
          </option>
        ))}
      </select>
    </div>
  )
}
