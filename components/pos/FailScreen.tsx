'use client'
import { useEffect } from 'react'
import { playGlobalSound } from '@/lib/audio/soundPlayer'

interface Props {
  errorCode?: string
  errorMsg?: string
  onDone?: () => void
  autoReturnMs?: number
}

export default function FailScreen({ errorCode, errorMsg, onDone, autoReturnMs = 3000 }: Props) {
  useEffect(() => {
    // 전역 error 사운드 재생 (실패 시 메뉴별 사운드는 의미 없음)
    void playGlobalSound('error')
  }, [])

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), autoReturnMs)
    return () => clearTimeout(t)
  }, [onDone, autoReturnMs])

  const friendlyMsg = getFriendlyMsg(errorCode, errorMsg)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ background: 'rgba(4, 7, 16, 0.93)', backdropFilter: 'blur(14px)' }}
    >
      <div className="flex flex-col items-center gap-6 px-6 max-w-sm w-full">

        {/* Error icon with shake + pop */}
        <div
          className="relative flex items-center justify-center rounded-full pos-pop pos-shake"
          style={{
            width: 112,
            height: 112,
            background: 'radial-gradient(circle, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.04) 100%)',
            border: '2px solid rgba(239,68,68,0.45)',
            boxShadow: '0 0 48px rgba(239,68,68,0.32), 0 0 96px rgba(239,68,68,0.10)',
          }}
        >
          <svg
            className="w-14 h-14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M6 18L18 6"
              style={{
                strokeDasharray: 50,
                strokeDashoffset: 50,
                animation: 'pos-draw 0.3s ease-out 0.2s forwards',
              }}
            />
            <path
              d="M6 6l12 12"
              style={{
                strokeDasharray: 50,
                strokeDashoffset: 50,
                animation: 'pos-draw 0.3s ease-out 0.38s forwards',
              }}
            />
          </svg>
        </div>

        {/* Error text */}
        <div className="text-center pos-rise">
          <h2 className="text-3xl font-black text-white tracking-tight">결제 실패</h2>
          <p className="text-base text-white/60 mt-2 leading-relaxed px-2 pos-rise-2">
            {friendlyMsg}
          </p>
          {errorCode && (
            <p className="text-xs font-mono text-white/25 mt-2 tracking-widest">[{errorCode}]</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3 pos-rise-3">
          <button
            onClick={() => onDone?.()}
            className="pos-btn pos-touch w-full rounded-2xl font-bold text-lg text-black"
            style={{
              background: 'var(--pos-accent)',
              boxShadow: '0 0 28px var(--pos-accent-glow)',
            }}
          >
            다시 시도
          </button>
          <button
            onClick={() => onDone?.()}
            className="pos-btn pos-touch w-full rounded-2xl font-semibold text-base glass-card text-white/60"
          >
            취소
          </button>
        </div>

        {/* Countdown bar */}
        <div className="w-full pos-rise-4">
          <div
            className="h-0.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full origin-left"
              style={{
                background: 'var(--pos-error)',
                animation: `pos-countdown ${autoReturnMs}ms linear forwards`,
              }}
            />
          </div>
          <p className="text-center text-xs text-white/25 font-mono mt-2">
            {Math.round(autoReturnMs / 1000)}초 후 자동 복귀
          </p>
        </div>
      </div>
    </div>
  )
}

function getFriendlyMsg(code?: string, msg?: string): string {
  const messages: Record<string, string> = {
    'A001': '바코드 유효시간이 만료되었습니다. 앱에서 다시 발급해 주세요.',
    'A002': '잔액이 부족합니다.',
    'P002': '이미 처리된 결제입니다.',
    'P003': '결제가 취소되었습니다.',
    'C002': '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  }
  return messages[code ?? ''] ?? msg ?? '잠시 후 다시 시도해 주세요.'
}
