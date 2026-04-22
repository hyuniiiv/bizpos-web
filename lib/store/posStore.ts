import { create } from 'zustand'
import type { MenuConfig } from '@/types/menu'
import type { Transaction } from '@/types/payment'

export type PosScreen =
  | 'single'
  | 'menu-select'
  | 'scan-wait'
  | 'processing'
  | 'success'
  | 'fail'
  | 'offline'

interface PosStore {
  screen: PosScreen
  selectedMenu: MenuConfig | null
  lastTransaction: Transaction | null
  lastError: string | null
  /** Mirrors settingsStore.isOnline — design compliance field */
  isOnline: boolean
  /** Mirrors settingsStore.pendingOfflineCount — design compliance field */
  pendingCount: number

  setScreen: (s: PosScreen) => void
  selectMenu: (menu: MenuConfig) => void
  clearMenu: () => void
  setLastTransaction: (tx: Transaction | null) => void
  setLastError: (err: string | null) => void
  setIsOnline: (v: boolean) => void
  setPendingCount: (n: number) => void
}

export const usePosStore = create<PosStore>((set) => ({
  screen: 'single',
  selectedMenu: null,
  lastTransaction: null,
  lastError: null,
  isOnline: true,
  pendingCount: 0,

  setScreen: (screen) => set({ screen }),
  selectMenu: (menu) => set({ selectedMenu: menu }),
  clearMenu: () => set({ selectedMenu: null }),
  setLastTransaction: (tx) => set({ lastTransaction: tx }),
  setLastError: (err) => set({ lastError: err }),
  setIsOnline: (v) => set({ isOnline: v }),
  setPendingCount: (n) => set({ pendingCount: n }),
}))
