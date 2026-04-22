'use client'

interface Props {
  value: string | null
  time: Date | null
}

export default function ScanLogBar({ value, time }: Props) {
  if (!value) return null

  const timeStr = time
    ? `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`
    : ''

  return (
    <div
      className="px-4 py-2 flex items-center gap-3 border-t border-white/10 text-sm transition-all duration-300"
      style={{ background: 'rgba(96, 165, 250, 0.12)', backdropFilter: 'blur(8px)' }}
    >
      <span className="text-blue-300 font-semibold whitespace-nowrap">📷 스캔됨</span>
      <span className="font-mono text-white/80 flex-1 truncate tracking-wider">{value}</span>
      <span className="text-white/35 font-mono whitespace-nowrap">{timeStr}</span>
    </div>
  )
}
