'use client'
import { useMemo, useState, useEffect } from 'react'
import CountDisplay from './CountDisplay'
import { useMenuStore } from '@/lib/store/menuStore'
import { useSettingsStore } from '@/lib/store/settingsStore'

const BARCODE_BARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  width: i % 3 === 0 ? '3px' : '1.5px',
}))

export default function SingleMenuScreen() {
  const { menus, getActiveMenus } = useMenuStore()
  const { config } = useSettingsStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const activeMenus = getActiveMenus()
  const currentMenu = activeMenus[0]
  const totalCount = menus.reduce((sum, m) => sum + m.count, 0)

  const barcodeBars = useMemo(() => BARCODE_BARS, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 상단 모드 표시 */}
      <div className="px-4 pt-4 pb-2">
        <span className="text-[10px] text-white/30 font-mono">단일메뉴</span>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col items-center px-6 justify-around overflow-hidden">

        {/* 로고 / 코너명 */}
        <div className="text-center">
          <h1
            className="font-black text-white tracking-tight drop-shadow-lg"
            style={{ fontSize: 'clamp(1.5rem, 4vmin, 2.5rem)' }}
          >
            {mounted ? (config.corner || 'BIZPOS') : 'BIZPOS'}
          </h1>
          {currentMenu && (
            <p className="text-base text-white/50 mt-1">{currentMenu.name}</p>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="text-center">
          <p
            className="font-bold text-white leading-snug"
            style={{ fontSize: 'clamp(0.9rem, 2.5vmin, 1.25rem)' }}
          >
            하단 리더기에 바코드를 인식해 주세요.
          </p>
          <p
            className="text-white/40 mt-1"
            style={{ fontSize: 'clamp(0.7rem, 2vmin, 0.875rem)' }}
          >
            Please scan the barcode on the bottom reader.
          </p>
        </div>

        {/* 판매량 카운트 */}
        <div
          className="glass-strong rounded-2xl w-full px-4"
          style={{ paddingTop: 'clamp(0.5rem, 2vmin, 1rem)', paddingBottom: 'clamp(0.5rem, 2vmin, 1rem)' }}
        >
          <CountDisplay count={mounted ? totalCount : 0} size="lg" />
        </div>

        {/* 음식 이미지 영역 */}
        <div className="flex items-center justify-center gap-4 opacity-60">
          <span style={{ fontSize: 'clamp(2rem, 6vmin, 3.5rem)' }}>🍜</span>
          <span style={{ fontSize: 'clamp(2rem, 6vmin, 3.5rem)' }}>🥗</span>
          <span style={{ fontSize: 'clamp(2rem, 6vmin, 3.5rem)' }}>🍱</span>
        </div>

        {/* 바코드 영역 (시각적) */}
        <div className="w-full flex justify-center gap-1 opacity-15">
          {barcodeBars.map((bar) => (
            <div
              key={bar.id}
              className="bg-white rounded-sm"
              style={{
                width: bar.width,
                height: 'clamp(20px, 4vmin, 40px)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
