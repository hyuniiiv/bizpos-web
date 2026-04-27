'use client'
import { openDB, type IDBPDatabase } from 'idb'
import type { BizPosDB } from './schema'
import type { OfflineRecord } from '@/types/payment'
import type { MenuConfig, DeviceConfig, ServiceCodeConfig, PeriodConfig } from '@/types/menu'

let dbInstance: IDBPDatabase<BizPosDB> | null = null

export async function getDB(): Promise<IDBPDatabase<BizPosDB>> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<BizPosDB>('bizpos-offline', 1, {
    upgrade(db) {
      // 오프라인 결제 대기
      const payments = db.createObjectStore('pending_payments', { keyPath: 'merchantOrderID' })
      payments.createIndex('by_synced', 'synced')
      payments.createIndex('by_saved_at', 'savedAt')

      // 바코드 중복 방지 (170초)
      const barcodes = db.createObjectStore('scanned_barcodes', { keyPath: 'barcodeInfo' })
      barcodes.createIndex('by_scanned_at', 'scannedAt')

      // 메뉴 설정
      db.createObjectStore('menus', { keyPath: 'id' })
      db.createObjectStore('periods', { keyPath: 'mealType' })
      db.createObjectStore('service_codes', { keyPath: 'id' })
      db.createObjectStore('device_config', { keyPath: 'key' })
      db.createObjectStore('transactions_local', { keyPath: 'id' })
    },
  })
  return dbInstance
}

// ── 오프라인 결제 ─────────────────────────────────────────

export async function savePendingPayment(record: OfflineRecord) {
  const db = await getDB()
  await db.put('pending_payments', record)
}

export async function getPendingPayments(): Promise<OfflineRecord[]> {
  const db = await getDB()
  const all = await db.getAll('pending_payments')
  return all.filter(r => !r.synced)
}

export async function markPaymentSynced(merchantOrderID: string) {
  const db = await getDB()
  const record = await db.get('pending_payments', merchantOrderID)
  if (record) {
    await db.put('pending_payments', { ...record, synced: true })
  }
}

// ── 바코드 중복 방지 ──────────────────────────────────────

export async function checkAndMarkBarcode(barcodeInfo: string): Promise<boolean> {
  const db = await getDB()
  const existing = await db.get('scanned_barcodes', barcodeInfo)
  if (existing) {
    // 170초(170000ms) 이내면 중복
    if (Date.now() - existing.scannedAt < 170_000) return false
  }
  await db.put('scanned_barcodes', { barcodeInfo, scannedAt: Date.now() })
  // 오래된 바코드 정리 (1시간 이상)
  const tx = db.transaction('scanned_barcodes', 'readwrite')
  const old = await tx.store.index('by_scanned_at').getAll(IDBKeyRange.upperBound(Date.now() - 3_600_000))
  for (const item of old) await tx.store.delete(item.barcodeInfo)
  await tx.done
  return true
}

// ── 설정 저장/조회 ────────────────────────────────────────

export async function saveConfig(key: string, value: string) {
  const db = await getDB()
  await db.put('device_config', { key, value })
}

export async function getConfig(key: string): Promise<string | null> {
  const db = await getDB()
  const item = await db.get('device_config', key)
  return item?.value ?? null
}

// ── 메뉴 설정 ─────────────────────────────────────────────

export async function getMenus(): Promise<MenuConfig[]> {
  const db = await getDB()
  return db.getAll('menus')
}

export async function saveMenu(menu: MenuConfig) {
  const db = await getDB()
  await db.put('menus', menu)
}

export async function deleteMenu(id: string) {
  const db = await getDB()
  await db.delete('menus', id)
}

export async function getServiceCodes(): Promise<ServiceCodeConfig[]> {
  const db = await getDB()
  return db.getAll('service_codes')
}

export async function saveServiceCode(sc: ServiceCodeConfig) {
  const db = await getDB()
  await db.put('service_codes', sc)
}

export async function deleteServiceCode(id: string) {
  const db = await getDB()
  await db.delete('service_codes', id)
}
