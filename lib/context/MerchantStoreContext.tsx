'use client'

import { createContext, useContext, ReactNode, useState } from 'react'
import type { Role } from '@/lib/roles/permissions'

export interface Merchant {
  id: string
  name: string
  biz_no: string
  address: string
  admin_id: string | null
  manager_id: string | null
  description: string | null
  created_at: string
}

export interface Store {
  id: string
  merchant_id: string
  store_name: string
  address: string
  is_active: boolean
  admin_id: string | null
  manager_id: string | null
  description: string | null
  created_at: string
}

interface MerchantStoreContextType {
  // 가맹점 계층
  selectedMerchantId: string | null
  merchants: Merchant[]
  setSelectedMerchant: (id: string) => void

  // 매장 계층
  assignedStoreIds: string[]
  selectedStoreIds: string[]
  stores: Store[]
  setSelectedStores: (ids: string[]) => void

  // 단말기 계층
  assignedTerminalIds: string[]

  // 사용자 정보
  userRole: Role | null
  userMerchantId: string | null

  // 필터링 함수
  filterByRole<T>(items: T[], roleField: keyof T): T[]
}

export const MerchantStoreContext = createContext<MerchantStoreContextType | undefined>(
  undefined
)

export function useMerchantStore() {
  const context = useContext(MerchantStoreContext)
  if (!context) {
    throw new Error('useMerchantStore must be used within MerchantStoreProvider')
  }
  return context
}

interface MerchantStoreProviderProps {
  children: ReactNode
  initialMerchants: Merchant[]
  initialStores: Store[]
  initialSelectedMerchantId: string | null
  initialSelectedStoreId: string | null
  initialAssignedStoreIds: string[]
  initialAssignedTerminalIds: string[]
  userRole: Role | null
  userMerchantId: string | null
}

export function MerchantStoreProvider({
  children,
  initialMerchants,
  initialStores,
  initialSelectedMerchantId,
  initialSelectedStoreId,
  initialAssignedStoreIds,
  initialAssignedTerminalIds,
  userRole,
  userMerchantId,
}: MerchantStoreProviderProps) {
  const [selectedMerchantId, setSelectedMerchantId] = useState(initialSelectedMerchantId)
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(
    initialSelectedStoreId ? [initialSelectedStoreId] : initialAssignedStoreIds
  )

  const filterByRole = <T,>(items: T[], roleField: keyof T): T[] => {
    return items
  }

  const value: MerchantStoreContextType = {
    selectedMerchantId,
    merchants: initialMerchants,
    setSelectedMerchant: setSelectedMerchantId,
    assignedStoreIds: initialAssignedStoreIds,
    selectedStoreIds,
    stores: initialStores,
    setSelectedStores: setSelectedStoreIds,
    assignedTerminalIds: initialAssignedTerminalIds,
    userRole,
    userMerchantId,
    filterByRole,
  }

  return (
    <MerchantStoreContext.Provider value={value}>
      {children}
    </MerchantStoreContext.Provider>
  )
}
