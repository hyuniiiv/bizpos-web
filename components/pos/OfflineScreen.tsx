'use client'
import { useSettingsStore } from '@/lib/store/settingsStore'
import CountDisplay from './CountDisplay'
import { useMenuStore } from '@/lib/store/menuStore'

export default function OfflineScreen() {
  const { config, pendingOfflineCount } = useSettingsStore()
  const { menus } = useMenuStore()
  const totalCount = menus.reduce((sum, m) => sum + m.count, 0)

  return (
    <div className="flex flex-col h-full select-none relative overflow-hidden">
      {/* Warm amber radial tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(245,158,11,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Offline status banner */}
      <div
        className="relative flex items-center gap-3 px-5 py-3 pos-warn-blink"
        style={{
          background: 'rgba(245,158,11,0.10)',
          borderBottom: '1px solid rgba(245,158,11,0.18)',
        }}
      >
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F59E0B"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
        </svg>
        <p className="text-sm font-bold text-amber-300 flex-1">
          오프라인 모드
          <span className="font-normal text-amber-400/60 ml-2">— 결제 내역이 로컬에 저장됩니다</span>
        </p>
        {pendingOfflineCount > 0 && (
          <span
            className="text-xs font-mono font-bold px-2.5 py-1 rounded-full shrink-0"
            style={{ background: 'rgba(245,158,11,0.22)', color: '#F59E0B' }}
          >
            미동기화 {pendingOfflineCount}건
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-6 justify-around py-4">

        {/* Brand */}
        <div className="text-center pos-rise">
          <p className="text-[10px] font-mono tracking-[0.25em] text-white/20 uppercase mb-1">
            Offline Mode
          </p>
          <h1
            className="font-black text-white tracking-tight leading-none"
            style={{ fontSize: 'clamp(1.8rem, 6vmin, 3rem)' }}
          >
            {config.corner || 'BIZPOS'}
          </h1>
        </div>

        {/* WiFi-off icon */}
        <div
          className="flex items-center justify-center rounded-full pos-rise-2"
          style={{
            width: 80,
            height: 80,
            background: 'rgba(245,158,11,0.10)',
            border: '1.5px solid rgba(245,158,11,0.28)',
          }}
        >
          <svg
            className="w-9 h-9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
          </svg>
        </div>

        {/* Instruction */}
        <div className="text-center pos-rise-3">
          <p className="font-bold text-white leading-snug" style={{ fontSize: 'clamp(1.1rem, 3.5vmin, 1.4rem)' }}>
            하단 리더기에 바코드를 인식해 주세요
          </p>
          <p className="text-sm font-mono mt-1.5" style={{ color: 'rgba(245,158,11,0.65)' }}>
            오프라인 결제 가능
          </p>
        </div>

        {/* Count card */}
        <div
          className="w-full rounded-2xl px-6 py-4 pos-rise-4"
          style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.18)',
          }}
        >
          <CountDisplay count={totalCount} size="lg" />
        </div>
      </div>

      {/* Bottom sync notice */}
      <div className="px-5 pb-5 text-center">
        <p className="text-xs text-white/22 font-mono">
          인터넷 연결 복구 시 미전송 내역이 자동으로 동기화됩니다
        </p>
      </div>
    </div>
  )
}
