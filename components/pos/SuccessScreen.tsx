'use client'
import { useEffect } from 'react'

interface Props {
  orderId?: string
  amount?: number
  userName?: string
  onDone?: () => void
  autoReturnMs?: number
}

export default function SuccessScreen({
  orderId, amount, userName, onDone, autoReturnMs = 3000
}: Props) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), autoReturnMs)
    return () => clearTimeout(t)
  }, [onDone, autoReturnMs])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      onClick={() => onDone?.()}
      style={{ background: 'rgba(4, 7, 16, 0.93)', backdropFilter: 'blur(14px)' }}
    >
      <div className="flex flex-col items-center gap-6 px-8 max-w-sm w-full">

        {/* Success icon with pop animation */}
        <div
          className="relative flex items-center justify-center rounded-full pos-pop"
          style={{
            width: 112,
            height: 112,
            background: 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.04) 100%)',
            border: '2px solid rgba(16,185,129,0.45)',
            boxShadow: '0 0 48px rgba(16,185,129,0.38), 0 0 96px rgba(16,185,129,0.12)',
          }}
        >
          <svg
            className="w-14 h-14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10B981"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M5 13l4 4L19 7"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100,
                animation: 'pos-draw 0.55s ease-out 0.35s forwards',
              }}
            />
          </svg>
        </div>

        {/* Result text */}
        <div className="text-center pos-rise">
          <h2 className="text-3xl font-black text-white tracking-tight">결제 완료</h2>
          {userName && (
            <p className="text-lg text-white/65 mt-1.5 pos-rise-2">{userName}</p>
          )}
          {amount && (
            <p
              className="font-black tabular-nums mt-3 pos-rise-3"
              style={{ fontSize: 'clamp(2.2rem, 9vmin, 3.5rem)', color: '#10B981' }}
            >
              {amount.toLocaleString()}
              <span className="text-xl font-normal ml-1.5 text-white/40">원</span>
            </p>
          )}
          {orderId && (
            <p className="text-xs font-mono text-white/22 mt-3 tracking-wider">{orderId}</p>
          )}
        </div>

        {/* Countdown bar */}
        <div className="w-full pos-rise-4">
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <div
              className="h-full rounded-full origin-left"
              style={{
                background: 'var(--pos-success)',
                animation: `pos-countdown ${autoReturnMs}ms linear forwards`,
              }}
            />
          </div>
          <p className="text-center text-xs text-white/28 font-mono mt-2">
            화면을 터치하면 즉시 복귀 &middot; {Math.round(autoReturnMs / 1000)}초 후 자동 복귀
          </p>
        </div>
      </div>
    </div>
  )
}
