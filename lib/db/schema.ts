import type { DBSchema } from 'idb'
import type { OfflineRecord } from '@/types/payment'
import type { MenuConfig, DeviceConfig, ServiceCodeConfig, PeriodConfig } from '@/types/menu'

export interface BizPosDB extends DBSchema {
  pending_payments: {
    key: string
    value: OfflineRecord
    indexes: { by_synced: number; by_saved_at: string }
  }
  scanned_barcodes: {
    key: string   // barcodeInfo (원본)
    value: { barcodeInfo: string; scannedAt: number }
    indexes: { by_scanned_at: number }
  }
  menus: {
    key: string
    value: MenuConfig
  }
  periods: {
    key: string
    value: PeriodConfig
  }
  service_codes: {
    key: string
    value: ServiceCodeConfig
  }
  device_config: {
    key: string
    value: { key: string; value: string }
  }
  transactions_local: {
    key: string
    value: {
      id: string
      merchantOrderID: string
      menuName: string
      userName: string
      amount: number
      status: string
      approvedAt: string
      createdAt: string
    }
  }
}
