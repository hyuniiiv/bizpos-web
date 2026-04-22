'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Merchant { id: string; name: string; biz_no: string }

export function MerchantSwitcher({ currentMerchantId }: { currentMerchantId: string }) {
  const router = useRouter()
  const [merchants, setMerchants] = useState<Merchant[]>([])

  useEffect(() => {
    fetch('/api/merchant/list')
      .then(r => r.json())
      .then(j => setMerchants(j.data ?? []))
      .catch(() => {})
  }, [])

  if (merchants.length <= 1) return null

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await fetch('/api/portal/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'merchant', id: e.target.value }),
    })
    router.refresh()
  }

  return (
    <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--bp-border)' }}>
      <p className="text-xs mb-1.5" style={{ color: 'var(--bp-text-3)' }}>매장 선택</p>
      <select
        value={currentMerchantId}
        onChange={handleChange}
        className="w-full px-2 py-1.5 text-xs rounded"
        style={{
          background: 'var(--bp-surface-2)',
          border: '1px solid var(--bp-border)',
          color: 'var(--bp-text)',
        }}
      >
        {merchants.map(m => (
          <option key={m.id} value={m.id} style={{ background: '#1e2533' }}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  )
}
