'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Merchant { id: string; name: string; biz_no: string }

export function MerchantSwitcher({ currentMerchantId }: { currentMerchantId: string }) {
  const router = useRouter()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/merchant/list')
      .then(r => r.json())
      .then(j => setMerchants(j.data ?? []))
      .catch(() => {})
  }, [])

  if (merchants.length === 0) return null

  const current = merchants.find(m => m.id === currentMerchantId) ?? merchants[0]

  // 가맹점이 1개면 전환 없이 이름만 표시
  if (merchants.length === 1) {
    return (
      <div className="px-2 py-3" style={{ borderBottom: '1px solid var(--bp-border)' }}>
        <div
          className="px-3 py-2 rounded-lg"
          style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
        >
          <div className="text-sm font-medium truncate text-white">{current.name}</div>
          <div className="text-xs" style={{ color: 'var(--bp-text-3)' }}>가맹점</div>
        </div>
      </div>
    )
  }

  const handleSelect = async (id: string) => {
    setOpen(false)
    await fetch('/api/portal/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'merchant', id }),
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
        <div className="truncate">{current.name}</div>
        <div className="text-xs" style={{ color: 'var(--bp-text-3)' }}>
          {merchants.length}개 가맹점
        </div>
      </button>

      {open && (
        <div
          className="mt-2 rounded-lg border overflow-hidden"
          style={{ background: 'var(--bp-surface-2)', borderColor: 'var(--bp-border)' }}
        >
          {merchants.map(m => (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className="w-full px-3 py-2 text-left text-sm transition-colors border-b last:border-b-0"
              style={{
                background: m.id === currentMerchantId ? 'var(--bp-accent)' : 'transparent',
                color: m.id === currentMerchantId ? '#000' : 'var(--bp-text)',
                borderColor: 'var(--bp-border)',
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
