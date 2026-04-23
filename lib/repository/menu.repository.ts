'use client'

/**
 * 메뉴 동기화 큐 Repository
 *
 * Electron 메인 프로세스(SQLite `pending_menu_changes`)와 통신하는 IPC 래퍼.
 * 브라우저(비-Electron) 환경에서는 `window.electronAPI`가 없으므로 no-op으로
 * 안전하게 동작한다.
 */

export interface PendingMenuChange {
  id: string
  operation: 'upsert' | 'delete'
  payload: unknown | null
  updated_at: number
  queued_at: number
  attempts: number
}

interface ElectronAPI {
  queueMenuChange(
    change: Omit<PendingMenuChange, 'queued_at' | 'attempts'>
  ): Promise<{ success: boolean }>
  getPendingMenuChanges(): Promise<PendingMenuChange[]>
  clearPendingMenuChange(id: string): Promise<{ success: boolean }>
  incrementMenuChangeAttempts(id: string): Promise<{ success: boolean }>
  getPendingMenuCount(): Promise<number>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

function api(): ElectronAPI | null {
  if (typeof window === 'undefined') return null
  return window.electronAPI ?? null
}

export const MenuRepository = {
  async queueChange(
    change: Omit<PendingMenuChange, 'queued_at' | 'attempts'>
  ): Promise<{ success: boolean }> {
    const a = api()
    if (!a) return { success: false }
    return a.queueMenuChange(change)
  },

  async getPending(): Promise<PendingMenuChange[]> {
    const a = api()
    if (!a) return []
    return a.getPendingMenuChanges()
  },

  async clear(id: string): Promise<{ success: boolean }> {
    const a = api()
    if (!a) return { success: false }
    return a.clearPendingMenuChange(id)
  },

  async incrementAttempts(id: string): Promise<{ success: boolean }> {
    const a = api()
    if (!a) return { success: false }
    return a.incrementMenuChangeAttempts(id)
  },

  async getPendingCount(): Promise<number> {
    const a = api()
    if (!a) return 0
    return a.getPendingMenuCount()
  },
}
