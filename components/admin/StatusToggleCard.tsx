'use client'

interface StatusToggleCardProps {
  isActive: boolean
  onToggle: () => Promise<void>
  activeText?: string
  inactiveText?: string
  confirmMessage?: string
}

export default function StatusToggleCard({
  isActive,
  onToggle,
  activeText = '정상 운영 중',
  inactiveText = '비활성 상태 — 결제가 차단됩니다',
  confirmMessage,
}: StatusToggleCardProps) {
  const handleClick = async () => {
    const msg = confirmMessage ?? (isActive
      ? '비활성화하면 결제가 차단됩니다. 계속하시겠습니까?'
      : '활성화합니다. 계속하시겠습니까?')
    if (!confirm(msg)) return
    await onToggle()
  }

  return (
    <div
      className="rounded-xl px-5 py-4 flex items-center justify-between"
      style={{
        background: isActive ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${isActive ? 'rgba(34,197,94,0.20)' : 'rgba(239,68,68,0.20)'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-red-400'}`} />
        <div>
          <p className="text-sm font-semibold text-white">
            {isActive ? '활성' : '비활성'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            {isActive ? activeText : inactiveText}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium" style={{ color: 'var(--bp-text-3)' }}>
          {isActive ? 'ON' : 'OFF'}
        </span>
        <button
          type="button"
          onClick={handleClick}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-white/20'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </div>
  )
}
