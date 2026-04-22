'use client'

interface Props {
  count: number
  label?: string
  subLabel?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function CountDisplay({
  count, label = '오늘의 판매량', subLabel = "Today's sales",
  size = 'lg', className = ''
}: Props) {
  const numSize = size === 'lg' ? 'text-7xl' : size === 'md' ? 'text-5xl' : 'text-3xl'
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div>
        <p className="text-base font-semibold text-white">{label}</p>
        <p className="text-sm text-white/45">{subLabel}</p>
      </div>
      <span className={`${numSize} font-black text-white leading-none drop-shadow-lg`}>
        {count.toLocaleString()}
      </span>
    </div>
  )
}
