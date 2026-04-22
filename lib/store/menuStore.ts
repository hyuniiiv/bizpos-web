import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MenuConfig, PeriodConfig, ServiceCodeConfig, DisplayMode, PosCategory, PosMenuItem } from '@/types/menu'
import { v4 as uuid } from 'uuid'

// uuid 없으면 간단 대체
function genId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

interface MenuStore {
  menus: MenuConfig[]
  periods: PeriodConfig[]
  serviceCodes: ServiceCodeConfig[]
  posCategories: PosCategory[]
  posMenuItems: PosMenuItem[]

  // 메뉴 CRUD
  addMenu: (menu: Omit<MenuConfig, 'id' | 'count'>) => void
  updateMenu: (id: string, updates: Partial<MenuConfig>) => void
  deleteMenu: (id: string) => void

  // 카운트
  incrementCount: (menuId: string) => void
  resetCount: (menuId?: string) => void

  // 서비스 구분코드
  addServiceCode: (sc: Omit<ServiceCodeConfig, 'id'>) => void
  deleteServiceCode: (id: string) => void
  getAmountByServiceCode: (code: string) => number | null

  // 현재 활성 메뉴 (현재 시각 기준)
  getActiveMenus: () => MenuConfig[]
  getCurrentMode: () => DisplayMode

  // 설정
  setPeriods: (periods: PeriodConfig[]) => void
  setMenus: (menus: MenuConfig[]) => void
  setServiceCodes: (codes: ServiceCodeConfig[]) => void
  loadDefaults: () => void
  clearAll: () => void

  // POS/Kiosk/TableOrder 카테고리 & 메뉴
  addPosCategory: (name: string) => void
  updatePosCategory: (id: string, updates: Partial<PosCategory>) => void
  deletePosCategory: (id: string) => void
  addPosMenuItem: (item: Omit<PosMenuItem, 'id' | 'sortOrder'>) => void
  updatePosMenuItem: (id: string, updates: Partial<PosMenuItem>) => void
  deletePosMenuItem: (id: string) => void
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function getNowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export const useMenuStore = create<MenuStore>()(
  persist(
    (set, get) => ({
      menus: [],
      periods: [],
      serviceCodes: [],
      posCategories: [],
      posMenuItems: [],

      loadDefaults: () => {
        const { menus } = get()
        if (menus.length > 0) return
        // 기본 메뉴 샘플
        set({
          menus: [
            {
              id: genId(), name: '한식', displayAmount: 8000, paymentAmount: 8000,
              mealType: 'breakfast', startTime: '06:30', endTime: '09:00',
              soundFile: 'success.mp3', isActive: true, count: 0,
            },
            {
              id: genId(), name: '한식', displayAmount: 8000, paymentAmount: 8000,
              mealType: 'lunch', startTime: '11:30', endTime: '12:30',
              soundFile: 'success.mp3', isActive: true, count: 0,
            },
            {
              id: genId(), name: '뷔페', displayAmount: 9000, paymentAmount: 9000,
              mealType: 'lunch', startTime: '11:30', endTime: '13:00',
              soundFile: 'success.mp3', isActive: true, count: 0,
            },
            {
              id: genId(), name: '한식', displayAmount: 8000, paymentAmount: 8000,
              mealType: 'dinner', startTime: '17:00', endTime: '19:00',
              soundFile: 'success.mp3', isActive: true, count: 0,
            },
          ],
          periods: [
            { mealType: 'breakfast', startTime: '06:30', endTime: '09:00', mode: 'single', label: '조식' },
            { mealType: 'lunch', startTime: '11:30', endTime: '13:00', mode: 'multi', label: '중식' },
            { mealType: 'dinner', startTime: '17:00', endTime: '20:00', mode: 'single', label: '석식' },
          ],
        })
      },

      addMenu: (menu) => set(s => ({
        menus: [...s.menus, { ...menu, id: genId(), count: 0 }]
      })),

      updateMenu: (id, updates) => set(s => ({
        menus: s.menus.map(m => m.id === id ? { ...m, ...updates } : m)
      })),

      deleteMenu: (id) => set(s => ({
        menus: s.menus.filter(m => m.id !== id)
      })),

      incrementCount: (menuId) => set(s => ({
        menus: s.menus.map(m => m.id === menuId ? { ...m, count: m.count + 1 } : m)
      })),

      resetCount: (menuId) => set(s => ({
        menus: menuId
          ? s.menus.map(m => m.id === menuId ? { ...m, count: 0 } : m)
          : s.menus.map(m => ({ ...m, count: 0 }))
      })),

      addServiceCode: (sc) => set(s => ({
        serviceCodes: [...s.serviceCodes, { ...sc, id: genId() }]
      })),

      deleteServiceCode: (id) => set(s => ({
        serviceCodes: s.serviceCodes.filter(c => c.id !== id)
      })),

      getAmountByServiceCode: (code) => {
        const sc = get().serviceCodes.find(c => c.code === code)
        return sc?.amount ?? null
      },

      getActiveMenus: () => {
        const now = getNowMinutes()
        return get().menus.filter(m => {
          if (!m.isActive) return false
          const start = timeToMinutes(m.startTime)
          const end = timeToMinutes(m.endTime)
          return now >= start && now <= end
        })
      },

      getCurrentMode: (): DisplayMode => {
        const now = getNowMinutes()
        const { periods } = get()
        for (const p of periods) {
          const start = timeToMinutes(p.startTime)
          const end = timeToMinutes(p.endTime)
          if (now >= start && now <= end) return p.mode
        }
        return 'single'
      },

      setPeriods: (periods) => set({ periods }),
      setMenus: (menus) => set({ menus }),
      setServiceCodes: (codes) => set({ serviceCodes: codes }),
      clearAll: () => set({ menus: [], periods: [], serviceCodes: [], posCategories: [], posMenuItems: [] }),

      addPosCategory: (name) => set(s => ({
        posCategories: [...s.posCategories, { id: genId(), name, sortOrder: s.posCategories.length, isActive: true }]
      })),
      updatePosCategory: (id, updates) => set(s => ({
        posCategories: s.posCategories.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deletePosCategory: (id) => set(s => ({
        posCategories: s.posCategories.filter(c => c.id !== id),
        posMenuItems: s.posMenuItems.filter(m => m.categoryId !== id),
      })),
      addPosMenuItem: (item) => set(s => ({
        posMenuItems: [...s.posMenuItems, { ...item, id: genId(), sortOrder: s.posMenuItems.filter(m => m.categoryId === item.categoryId).length }]
      })),
      updatePosMenuItem: (id, updates) => set(s => ({
        posMenuItems: s.posMenuItems.map(m => m.id === id ? { ...m, ...updates } : m)
      })),
      deletePosMenuItem: (id) => set(s => ({
        posMenuItems: s.posMenuItems.filter(m => m.id !== id)
      })),
    }),
    { name: 'bizpos-menu-store' }
  )
)
