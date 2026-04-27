import type { OfflineRecord, Transaction } from '@/types/payment'
import type { MenuConfig } from '@/types/menu'

/**
 * 결제 및 거래 관련 데이터 저장을 위한 Repository 계층
 * Electron 환경의 메인 프로세스(SQLite)와 통신하는 IPC 인터페이스를 캡슐화합니다.
 */

export const PaymentRepository = {
  // ── 오프라인 결제 대기열 ──────────────────────────────
  async savePendingPayment(record: OfflineRecord): Promise<{ success: boolean }> {
    const api = (window.electronAPI as (typeof window.electronAPI & { db?: ElectronDB }))
    if (api?.db) return await api.db.savePendingPayment(record)
    throw new Error('Electron DB API not available')
  },

  async getPendingPayments(): Promise<OfflineRecord[]> {
    const api = (window.electronAPI as (typeof window.electronAPI & { db?: ElectronDB }))
    if (api?.db) return await api.db.getPendingPayments()
    throw new Error('Electron DB API not available')
  },

  async markPaymentSynced(merchantOrderID: string): Promise<{ success: boolean }> {
    const api = (window.electronAPI as (typeof window.electronAPI & { db?: ElectronDB }))
    if (api?.db) return await api.db.markPaymentSynced(merchantOrderID)
    throw new Error('Electron DB API not available')
  },

  // ── 거래 기록 ─────────────────────────────────────────
  async saveTransaction(tx: Transaction): Promise<{ success: boolean }> {
    const api = (window.electronAPI as (typeof window.electronAPI & { db?: ElectronDB }))
    if (api?.db) return await api.db.saveTransaction(tx)
    throw new Error('Electron DB API not available')
  },

  // ── 메뉴 설정 ─────────────────────────────────────────────
  async getMenus(): Promise<MenuConfig[]> {
    const api = (window.electronAPI as (typeof window.electronAPI & { db?: ElectronDB }))
    if (api?.db) return await api.db.getMenus()
    throw new Error('Electron DB API not available')
  },

  async saveMenu(menu: MenuConfig): Promise<{ success: boolean }> {
    const api = (window.electronAPI as (typeof window.electronAPI & { db?: ElectronDB }))
    if (api?.db) return await api.db.saveMenu(menu)
    throw new Error('Electron DB API not available')
  },

  async deleteMenu(id: string): Promise<{ success: boolean }> {
    const api = (window.electronAPI as (typeof window.electronAPI & { db?: ElectronDB }))
    if (api?.db) return await api.db.deleteMenu(id)
    throw new Error('Electron DB API not available')
  }
}
