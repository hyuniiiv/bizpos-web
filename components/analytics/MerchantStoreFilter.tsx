'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export type MerchantOption = { id: string; name: string }
export type StoreOption = { id: string; store_name: string }

interface Props {
  merchants: MerchantOption[]
  stores: StoreOption[]
  selectedMerchantId: string
  selectedStoreId: string
  basePath?: string
}

const selectStyle = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: 'white',
}

export default function MerchantStoreFilter({
  merchants,
  stores,
  selectedMerchantId,
  selectedStoreId,
  basePath = '/store/admin/analytics',
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v)
      else sp.delete(k)
    })
    router.push(`${basePath}?${sp.toString()}`)
  }

  function handleMerchantChange(merchantId: string) {
    navigate({ merchantId, storeId: '' })
  }

  function handleStoreChange(storeId: string) {
    navigate({ storeId })
  }

  if (merchants.length <= 1 && stores.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {merchants.length > 1 && (
        <select
          value={selectedMerchantId}
          onChange={e => handleMerchantChange(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          style={selectStyle}
        >
          {merchants.map(m => (
            <option key={m.id} value={m.id} style={{ background: '#0F1B4C' }}>
              {m.name}
            </option>
          ))}
        </select>
      )}
      {stores.length > 0 && (
        <select
          value={selectedStoreId}
          onChange={e => handleStoreChange(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          style={selectStyle}
        >
          <option value="" style={{ background: '#0F1B4C' }}>전체 매장</option>
          {stores.map(s => (
            <option key={s.id} value={s.id} style={{ background: '#0F1B4C' }}>
              {s.store_name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
