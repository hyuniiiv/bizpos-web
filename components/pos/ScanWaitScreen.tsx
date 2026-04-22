'use client'
import { useEffect, useState } from 'react'
import { usePosStore } from '@/lib/store/posStore'
import { useSettingsStore } from '@/lib/store/settingsStore'

export default function ScanWaitScreen() {
  const { selectedMenu, setScreen, clearMenu } = usePosStore()
  const { config } = useSettingsStore()
  const [barWidths, setBarWidths] = useState<number[]>([])
  const [time, setTime] = useState('')

  useEffect(() => {
    setBarWidths(Array.from({ length: 28 }, () => Math.random() > 0.5 ? 3 : 1.5))
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const handleBack = () => {
    clearMenu()
    setScreen('menu-select')
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden select-none">
      {/* Background grid texture */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,214,160,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,214,160,1) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between px-5 pt-5 pb-3">
        <div className="pos-rise">
          <p className="text-[10px] font-mono tracking-[0.22em] text-white/25 uppercase mb-0.5">
            POS Terminal
          </p>
          <h1
            className="font-black tracking-tight text-white leading-none"
            style={{ fontSize: 'clamp(1.5rem, 5vmin, 2.4rem)' }}
          >
            {config.corner || 'BIZPOS'}
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
      <div className="flex-1 flex flex-col items-center justify-around px-5">
        {selectedMenu ? (
          /* ── Selected menu display ── */
          <div className="pos-rise w-full flex flex-col items-center gap-5">
            <div
              className="rounded-3xl p-8 text-center w-full pos-card-accent pos-breathe"
            >
              <p className="text-[10px] font-mono tracking-[0.25em] text-white/35 uppercase mb-4">
                Selected Menu
              </p>
              <p
                className="font-black text-white tabular-nums leading-none"
                style={{ fontSize: 'clamp(2.8rem, 11vmin, 4.5rem)' }}
              >
                {selectedMenu.displayAmount.toLocaleString()}
                <span className="text-xl font-normal ml-2 text-white/45">원</span>
              </p>
              <p className="text-lg font-semibold text-white/65 mt-3">{selectedMenu.name}</p>
            </div>

            <p className="text-sm text-white/35 font-mono text-center">
              하단 리더기에 바코드를 인식해 주세요
            </p>
          </div>
        ) : (
          /* ── Scan viewfinder ── */
          <div className="flex flex-col items-center gap-7 w-full pos-rise">
            {/* Viewfinder frame */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: 'min(52vmin, 210px)', height: 'min(52vmin, 210px)' }}
            >
              {/* Corner brackets */}
              {[
                'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl',
                'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl',
                'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl',
                'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl',
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-9 h-9 ${cls}`}
                  style={{ borderColor: 'var(--pos-accent)' }}
                />
              ))}

              {/* Pulse rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                {[
                  { cls: 'pos-ring-1', opacity: 'rgba(6,214,160,0.18)' },
                  { cls: 'pos-ring-2', opacity: 'rgba(6,214,160,0.12)' },
                  { cls: 'pos-ring-3', opacity: 'rgba(6,214,160,0.07)' },
                ].map(({ cls, opacity }, i) => (
                  <div
                    key={i}
                    className={`absolute w-16 h-16 rounded-full ${cls}`}
                    style={{ background: opacity, border: `1px solid ${opacity}` }}
                  />
                ))}
                {/* Center dot */}
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ background: 'var(--pos-accent)', boxShadow: '0 0 12px var(--pos-accent-glow)' }}
                />
              </div>

              {/* Scan beam */}
              <div className="absolute inset-x-4 overflow-hidden" style={{ top: 10, bottom: 10 }}>
                <div
                  className="absolute left-0 right-0 h-px pos-scan-beam"
                  style={{
                    background: `linear-gradient(90deg, transparent, var(--pos-accent) 30%, var(--pos-accent) 70%, transparent)`,
                    boxShadow: '0 0 10px var(--pos-accent-glow), 0 0 20px rgba(6,214,160,0.15)',
                  }}
                />
              </div>
            </div>

            {/* Instruction text */}
            <div className="text-center">
              <p className="font-bold text-white leading-snug" style={{ fontSize: 'clamp(1.1rem, 3.8vmin, 1.5rem)' }}>
                바코드를 스캔하세요
              </p>
              <p className="text-sm text-white/30 mt-1.5 font-mono tracking-wider">
                Scan the barcode below
              </p>
            </div>

            {/* Barcode decoration */}
            <div className="flex justify-center gap-[2px] opacity-[0.12]">
              {barWidths.map((w, i) => (
                <div key={i} className="bg-white rounded-sm" style={{ width: `${w}px`, height: '38px' }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="px-5 pb-6">
        <button
          onClick={handleBack}
          className="pos-btn pos-touch w-full rounded-2xl glass-card"
        >
          <span className="flex items-center gap-2 text-white/55 font-semibold text-base">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            메뉴 선택으로 돌아가기
          </span>
        </button>
      </div>
    </div>
  )
}
