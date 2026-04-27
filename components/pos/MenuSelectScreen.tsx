'use client'
import MenuCard from './MenuCard'

const BARCODE_BARS = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 3 : 1.5))
import { useMenuStore } from '@/lib/store/menuStore'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { usePosStore } from '@/lib/store/posStore'
import type { MenuConfig } from '@/types/menu'

export default function MenuSelectScreen() {
  const { menus, getActiveMenus } = useMenuStore()
  const { config } = useSettingsStore()
  const { selectMenu, setScreen } = usePosStore()

  const activeMenus = getActiveMenus().slice(0, 4)
  const totalCount = menus.reduce((sum, m) => sum + m.count, 0)

  const handleSelect = (menu: MenuConfig) => {
    selectMenu(menu)
    setScreen('scan-wait')
  }

  const gridCols = activeMenus.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'


  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[10px] text-white/30 font-mono">메뉴선택_기능</span>
        <span className="text-2xl font-black text-white">{totalCount}</span>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col items-center px-4 justify-between py-2 overflow-hidden">

        {/* 로고 */}
        <div className="text-center">
          <h1 className="font-black text-white tracking-tight drop-shadow-lg text-[clamp(1.5rem,4vmin,2.5rem)] lg:text-3xl">
            {config.name || config.corner || 'BIZPOS'}
          </h1>
        </div>

        {/* 안내 메시지 */}
        <div className="text-center">
          <p className="font-bold text-white text-[clamp(0.9rem,2.5vmin,1.1rem)]">이용하실 메뉴를 선택해 주세요.</p>
          <p className="text-white/40 mt-1 text-[clamp(0.7rem,2vmin,0.8rem)]">Please select a menu.</p>
        </div>

        {/* 메뉴 카드 그리드 */}
        {activeMenus.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/40 text-base">
            현재 운영 중인 메뉴가 없습니다
          </div>
        ) : (
          <div className={`grid ${gridCols} auto-rows-fr gap-3 flex-1 min-h-0 w-full`}>
            {activeMenus.map((menu) => (
              <MenuCard key={menu.id} menu={menu} onSelect={handleSelect} />
            ))}
          </div>
        )}

        {/* 음식 이모지 */}
        <div className="flex items-center justify-center gap-3 opacity-60">
          <span className="text-[clamp(2rem,5vmin,3rem)]">🍜</span>
          <span className="text-[clamp(2rem,5vmin,3rem)]">🥗</span>
          <span className="text-[clamp(2rem,5vmin,3rem)]">🍱</span>
        </div>

        {/* 바코드 줄무늬 */}
        <div className="w-full flex justify-center gap-1 opacity-15">
          {BARCODE_BARS.map((width, i) => (
            <div
              key={i}
              className="bg-white rounded-sm h-[clamp(16px,3.5vmin,32px)]"
              style={{ width: `${width}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
