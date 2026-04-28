import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import bcrypt from 'bcryptjs'
import { idbStorage } from './idbStorage'
import type { DeviceConfig } from '@/types/menu'

export type TerminalType = 'ticket_checker' | 'pos' | 'kiosk' | 'table_order'

interface SettingsStore {
  config: DeviceConfig
  isOnline: boolean
  pendingOfflineCount: number
  deviceToken: string | null
  deviceTerminalId: string | null
  terminalType: TerminalType
  updateConfig: (updates: Partial<DeviceConfig>) => Promise<void>
  setOnline: (v: boolean) => void
  setPendingCount: (n: number) => void
  verifyPin: (pin: string) => Promise<boolean>
  setDeviceToken: (token: string, terminalId: string) => void
  setTerminalType: (type: TerminalType) => void
  clearDeviceToken: () => void
}

const BCRYPT_ROUNDS = 10

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      config: {
        termId: '01',
        merchantId: '',
        bizNo: '',
        name: '',
        corner: '',
        adminPin: '1234',
        serialPort: 'COM3',
        offlineMode: false,
        apiEnv: 'development',
        autoResetTime: '00:00',
        barcodeReaderType: 'keyboard' as const,
        barcodePort: 'COM4',
        externalDisplay: true,
        cafeteriaMode: false,
        inputPolicy: {
          barcode: 'bizplay_payment',
          qr: 'bizplay_payment',
          rfcard: 'bizplay_payment',
        },
      },
      isOnline: true,
      pendingOfflineCount: 0,
      deviceToken: null,
      deviceTerminalId: null,
      terminalType: 'ticket_checker' as TerminalType,
      updateConfig: async (updates) => {
        if (updates.adminPin !== undefined && !updates.adminPin.startsWith('$2')) {
          updates = { ...updates, adminPin: await bcrypt.hash(updates.adminPin, BCRYPT_ROUNDS) }
        }
        set(s => ({ config: { ...s.config, ...updates } }))
      },
      setOnline: (v) => set({ isOnline: v }),
      setPendingCount: (n) => set({ pendingOfflineCount: n }),
      setDeviceToken: (token, terminalId) => set({ deviceToken: token, deviceTerminalId: terminalId }),
      setTerminalType: (type) => set({ terminalType: type }),
      clearDeviceToken: () => set({ deviceToken: null, deviceTerminalId: null, terminalType: 'ticket_checker' }),
      verifyPin: async (pin: string) => {
        const stored = get().config.adminPin
        if (!stored.startsWith('$2')) return pin === stored
        return bcrypt.compare(pin, stored)
      },
    }),
    {
      name: 'bizpos-settings',
      storage: createJSONStorage(() => idbStorage),
      merge: (persisted: unknown, current: SettingsStore) => {
        const p = persisted as Partial<SettingsStore>
        return {
          ...current,
          ...p,
          config: { ...current.config, ...(p.config ?? {}) },
        }
      },
    }
  )
)
