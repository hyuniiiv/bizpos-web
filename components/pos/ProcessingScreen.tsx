'use client'

export default function ProcessingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ background: 'rgba(4, 7, 16, 0.93)', backdropFilter: 'blur(14px)' }}
    >
      <div className="flex flex-col items-center gap-8 px-8 max-w-sm w-full">

        {/* Triple orbital ring animation */}
        <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full pos-orbit-cw"
            style={{
              border: '2.5px solid transparent',
              borderTopColor: 'var(--pos-accent)',
              borderRightColor: 'rgba(6,214,160,0.25)',
            }}
          />
          {/* Middle ring */}
          <div
            className="absolute inset-5 rounded-full pos-orbit-ccw"
            style={{
              border: '2px solid transparent',
              borderTopColor: 'rgba(6,214,160,0.55)',
              borderLeftColor: 'rgba(6,214,160,0.18)',
            }}
          />
          {/* Inner ring */}
          <div
            className="absolute inset-10 rounded-full pos-orbit-med"
            style={{
              border: '1.5px solid transparent',
              borderBottomColor: 'var(--pos-accent)',
              borderRightColor: 'rgba(6,214,160,0.3)',
            }}
          />
          {/* Center glow core */}
          <div
            className="w-8 h-8 rounded-full"
            style={{
              background: 'radial-gradient(circle, var(--pos-accent) 0%, rgba(6,214,160,0.15) 100%)',
              boxShadow: '0 0 24px var(--pos-accent-glow), 0 0 48px rgba(6,214,160,0.15)',
            }}
          />
        </div>

        {/* Status text */}
        <div className="text-center pos-rise">
          <p className="text-2xl font-bold text-white tracking-tight">결제 처리 중</p>
          <p className="text-sm text-white/40 mt-2 font-mono tracking-widest uppercase">
            Processing payment...
          </p>
        </div>

        {/* Warning notice */}
        <div
          className="w-full rounded-2xl px-5 py-4 text-center pos-rise-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm font-semibold text-white/55">단말기를 건드리지 마세요</p>
          <p className="text-xs text-white/25 mt-1 font-mono">Do not touch the device</p>
        </div>
      </div>
    </div>
  )
}
