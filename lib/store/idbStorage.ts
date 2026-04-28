import { openDB } from 'idb'
import type { StateStorage } from 'zustand/middleware'

const DB_NAME = 'bizpos-store'
const STORE_NAME = 'keyval'

const getDb = (() => {
  let promise: ReturnType<typeof openDB> | null = null
  return () => {
    if (typeof window === 'undefined') return null
    if (!promise) {
      promise = openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME)
          }
        },
      })
    }
    return promise
  }
})()

export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const dbPromise = getDb()
    if (!dbPromise) return null
    const db = await dbPromise
    const value = await db.get(STORE_NAME, name)

    // 최초 1회: localStorage → IDB 마이그레이션
    if (value === undefined || value === null) {
      try {
        const lsValue = localStorage.getItem(name)
        if (lsValue) {
          await db.put(STORE_NAME, lsValue, name)
          localStorage.removeItem(name)
          return lsValue
        }
      } catch { /* ignore */ }
      return null
    }
    return value ?? null
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const dbPromise = getDb()
    if (!dbPromise) return
    const db = await dbPromise
    await db.put(STORE_NAME, value, name)
  },

  removeItem: async (name: string): Promise<void> => {
    const dbPromise = getDb()
    if (!dbPromise) return
    const db = await dbPromise
    await db.delete(STORE_NAME, name)
  },
}
