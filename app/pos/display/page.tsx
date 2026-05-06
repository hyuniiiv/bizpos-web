'use client'

import { useEffect, useState, useRef } from 'react'

type CartItem = { name: string; price: number; qty: number }

type DisplayPayload = {
  terminalType: 'ticket_checker' | 'pos' | 'kiosk' | 'table_order'
  status: 'idle' | 'success' | 'fail' | 'order' | 'processing'
  count?: number
  cart?: CartItem[]
  total?: number
  logoUrl?: string
  storeName?: string
}

const FLASH_DURATION = 1800

export default function DisplayPage() {
  const [data, setData] = useState<DisplayPayload>({
    terminalType: 'ticket_checker',
    status: 'idle',
    count: 0,
  })
  const [flash, setFlash] = useState<'none' | 'green' | 'red'>('none')
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onDisplayUpdate) return
    const unsub = api.onDisplayUpdate((payload: DisplayPayload) => {
      if (payload.status === 'success') triggerFlash('green')
      else if (payload.status === 'fail') triggerFlash('red')
      setData(payload)
    })
    return unsub
  }, [])

  function triggerFlash(color: 'green' | 'red') {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setFlash(color)
    flashTimer.current = setTimeout(() => setFlash('none'), FLASH_DURATION)
  }

  if (data.terminalType === 'ticket_checker') {
    return <TicketCheckerDisplay data={data} flash={flash} />
  }
  return <PosDisplay data={data} flash={flash} />
}

// ─── 식권체크기 화면 ──────────────────────────────────────────
function TicketCheckerDisplay({
  data,
  flash,
}: {
  data: DisplayPayload
  flash: 'none' | 'green' | 'red'
}) {
  const isGreen = flash === 'green'
  const isRed = flash === 'red'

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center select-none overflow-hidden"
      style={{
        background: isGreen
          ? 'radial-gradient(ellipse at center, #052e16 0%, #000 100%)'
          : isRed
          ? 'radial-gradient(ellipse at center, #3b0a0a 0%, #000 100%)'
          : '#0a0a0a',
        transition: 'background 0.12s',
      }}
    >
      {/* 경광봉 */}
      <div className="flex gap-10 mb-16">
        <Beacon color="green" active={isGreen} />
        <Beacon color="red" active={isRed} />
      </div>

      {/* 카운트 */}
      <p
        className="text-9xl font-black tabular-nums"
        style={{
          color: isGreen ? '#4ade80' : isRed ? '#f87171' : '#ffffff',
          textShadow: isGreen
            ? '0 0 40px #22c55e, 0 0 80px #16a34a'
            : isRed
            ? '0 0 40px #ef4444, 0 0 80px #dc2626'
            : 'none',
          transition: 'color 0.12s, text-shadow 0.12s',
        }}
      >
        {(data.count ?? 0).toLocaleString()}
      </p>
      <p className="text-2xl font-medium mt-4" style={{ color: '#ffffff55' }}>
        오늘 정상 처리
      </p>

      {flash !== 'none' && (
        <p
          className="absolute bottom-16 text-3xl font-bold tracking-widest"
          style={{
            color: isGreen ? '#4ade80' : '#f87171',
            textShadow: isGreen ? '0 0 20px #22c55e' : '0 0 20px #ef4444',
            animation: 'blink 0.35s ease-in-out infinite',
          }}
        >
          {isGreen ? '✓  정상' : '✗  비정상'}
        </p>
      )}

      <style>{`
        @keyframes beacon-green {
          0%,100% { opacity:1; box-shadow:0 0 35px 12px #22c55e, 0 0 70px 25px #16a34a; }
          50%      { opacity:0.15; box-shadow:none; }
        }
        @keyframes beacon-red {
          0%,100% { opacity:1; box-shadow:0 0 35px 12px #ef4444, 0 0 70px 25px #dc2626; }
          50%      { opacity:0.15; box-shadow:none; }
        }
        @keyframes blink {
          0%,100% { opacity:1; }
          50%      { opacity:0.35; }
        }
      `}</style>
    </div>
  )
}

function Beacon({ color, active }: { color: 'green' | 'red'; active: boolean }) {
  const dim = color === 'green' ? '#14532d' : '#7f1d1d'
  const lit = color === 'green' ? '#4ade80' : '#f87171'
  return (
    <div
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        background: active ? lit : dim,
        animation: active ? `beacon-${color} 0.35s ease-in-out infinite` : 'none',
        transition: 'background 0.1s',
      }}
    />
  )
}

// ─── POS 화면 ─────────────────────────────────────────────────
function PosDisplay({
  data,
  flash,
}: {
  data: DisplayPayload
  flash: 'none' | 'green' | 'red'
}) {
  const cart = data.cart ?? []
  const total = data.total ?? 0
  const isIdle = data.status === 'idle'
  const isSuccess = flash === 'green'
  const isFail = flash === 'red'

  return (
    <div
      className="w-screen h-screen flex flex-col select-none overflow-hidden"
      style={{ background: '#0f172a', color: '#f1f5f9' }}
    >
      <div
        className="flex items-center justify-center py-5 px-8 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-xl font-bold tracking-wide text-white/60">
          {data.storeName || 'BIZPOS'}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {isSuccess ? (
          <div className="flex flex-col items-center gap-6">
            <span className="text-8xl" style={{ animation: 'pop 0.4s ease-out' }}>✓</span>
            <p className="text-4xl font-bold text-green-400">결제 완료</p>
            <p className="text-5xl font-black">{total.toLocaleString()}원</p>
          </div>
        ) : isFail ? (
          <div className="flex flex-col items-center gap-6">
            <span className="text-8xl text-red-400">✗</span>
            <p className="text-4xl font-bold text-red-400">결제 실패</p>
            <p className="text-xl text-white/50">다시 시도해 주세요</p>
          </div>
        ) : isIdle || cart.length === 0 ? (
          <div className="flex flex-col items-center gap-8">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="logo" className="max-w-xs max-h-48 object-contain" />
            ) : (
              <div className="text-7xl font-black text-white/15">{data.storeName || 'BIZPOS'}</div>
            )}
            <p className="text-xl text-white/30">주문을 선택해 주세요</p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="space-y-3 mb-6">
              {cart.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-3 px-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <span className="text-lg font-medium">
                    {item.name}
                    {item.qty > 1 && (
                      <span className="ml-2 text-white/40 text-base">×{item.qty}</span>
                    )}
                  </span>
                  <span className="text-lg font-semibold text-blue-300">
                    {(item.price * item.qty).toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
            <div
              className="flex justify-between items-center py-4 px-4 rounded-xl"
              style={{
                background: 'rgba(96,165,250,0.15)',
                border: '1px solid rgba(96,165,250,0.30)',
              }}
            >
              <span className="text-xl font-bold">합 계</span>
              <span className="text-3xl font-black text-blue-300">
                {total.toLocaleString()}원
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pop {
          0%   { transform:scale(0.5); opacity:0; }
          70%  { transform:scale(1.2); }
          100% { transform:scale(1);   opacity:1; }
        }
      `}</style>
    </div>
  )
}
