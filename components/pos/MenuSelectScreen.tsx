'use client'
import { useEffect, useState } from 'react'
import { useMenuStore } from '@/lib/store/menuStore'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { usePosStore } from '@/lib/store/posStore'
import TodayStatBar from './TodayStatBar'
import MenuCard from './MenuCard'
import type { MenuConfig } from '@/types/menu'

interface Props {
  refreshTrigger?: number
}

export default function MenuSelectScreen({ refreshTrigger }: Props) {
  const { getActiveMenus } = useMenuStore()
  const { config } = useSettingsStore()
  const { selectMenu, setScreen } = usePosStore()
  const showStatBar = !config.showPaymentList
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const activeMenus = getActiveMenus().slice(0, 4)
  const gridCols = activeMenus.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'

  const handleSelect = (menu: MenuConfig) => {
    selectMenu(menu)
    setScreen('scan-wait')
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden select-none">
      {showStatBar && <TodayStatBar refreshTrigger={refreshTrigger} />}

      {/* Background grid texture — ScanWaitScreen과 동일 */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,214,160,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,214,160,1) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Header — ScanWaitScreen과 동일 */}
      <div className="relative flex items-start justify-between px-5 pt-5 pb-3">
        <div className="pos-rise">
          <p className="text-[10px] font-mono tracking-[0.22em] text-white/25 uppercase mb-0.5">
            POS Terminal
          </p>
          <h1
            className="font-black tracking-tight text-white leading-none"
            style={{ fontSize: 'clamp(1.5rem, 5vmin, 2.4rem)' }}
          >
            {config.name || config.corner || 'BIZPOS'}
          </h1>
        </div>

        <div className="text-right pos-rise-2">
          <p
            className="font-mono font-bold text-white/85 tabular-nums leading-none"
            style={{ fontSize: 'clamp(1.5rem, 5vmin, 2.2rem)' }}
          >
            {time}
          </p>
          <span className="flex items-center justify-end gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-widest">
              Online
            </span>
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="relative flex-1 flex flex-col px-5 pb-5 gap-4 min-h-0">
        <div className="text-center">
          <p className="font-bold text-white" style={{ fontSize: 'clamp(1rem, 3vmin, 1.25rem)' }}>
            이용하실 메뉴를 선택해 주세요
          </p>
          <p className="text-[10px] font-mono text-white/30 mt-0.5 tracking-wider">
            Please select a menu
          </p>
        </div>

        {activeMenus.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
            현재 운영 중인 메뉴가 없습니다
          </div>
        ) : (
          <div className={`grid ${gridCols} auto-rows-fr gap-3 flex-1 min-h-0`}>
            {activeMenus.map((menu) => (
              <MenuCard key={menu.id} menu={menu} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
