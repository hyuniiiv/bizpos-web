'use client'

import { useStore } from '@/lib/context/StoreContext'
import { useState } from 'react'

export function StoreSwitcher() {
  const { storeId, storeName, stores, setStore } = useStore()
  const [open, setOpen] = useState(false)

  if (stores.length <= 1) return null

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
        <div className="truncate">{storeName}</div>
        <div className="text-xs" style={{ color: 'var(--bp-text-3)' }}>
          {stores.length}개 매장
        </div>
      </button>

      {open && (
        <div
          className="mt-2 rounded-lg border overflow-hidden"
          style={{
            background: 'var(--bp-surface-2)',
            borderColor: 'var(--bp-border)',
          }}
        >
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => {
                setStore(store.id)
                setOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm transition-colors border-b last:border-b-0"
              style={{
                background: store.id === storeId ? 'var(--bp-accent)' : 'transparent',
                color: store.id === storeId ? '#000' : 'var(--bp-text)',
                borderColor: 'var(--bp-border)',
              }}
            >
              {store.store_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
