'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export interface Store {
  id: string
  merchant_id: string
  store_name: string
  is_active: boolean
}

interface StoreContextType {
  storeId: string | null
  storeName: string
  stores: Store[]
  setStore: (storeId: string) => void
  loading: boolean
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

interface StoreProviderProps {
  children: ReactNode
  initialStoreId?: string
  initialStores?: Store[]
}

export function StoreProvider({ children, initialStoreId, initialStores = [] }: StoreProviderProps) {
  const [storeId, setStoreId] = useState<string | null>(initialStoreId || null)
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [loading, setLoading] = useState(false)

  // localStorage에서 선택된 매장 복원
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bp_selected_store')
      if (saved && stores.find(s => s.id === saved)) {
        setStoreId(saved)
      } else if (stores.length > 0 && !storeId) {
        // 첫 매장을 기본값으로 설정
        setStoreId(stores[0].id)
      }
    }
  }, [stores])

  const handleSetStore = (newStoreId: string) => {
    if (stores.find(s => s.id === newStoreId)) {
      setStoreId(newStoreId)
      if (typeof window !== 'undefined') {
        localStorage.setItem('bp_selected_store', newStoreId)
      }
    }
  }

  const currentStore = stores.find(s => s.id === storeId)
  const storeName = currentStore?.store_name || '매장 선택'

  const value: StoreContextType = {
    storeId,
    storeName,
    stores,
    setStore: handleSetStore,
    loading,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return context
}
