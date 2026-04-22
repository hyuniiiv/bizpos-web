'use client'
import type { MenuConfig } from '@/types/menu'

interface Props {
  menu: MenuConfig
  onSelect: (menu: MenuConfig) => void
}

export default function MenuCard({ menu, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(menu)}
      className="pos-btn relative flex flex-col items-center justify-center rounded-2xl p-4 w-full h-full"
      style={{
        background: 'rgba(6,214,160,0.07)',
        border: '1px solid rgba(6,214,160,0.16)',
        minHeight: 130,
      }}
    >
      {/* Count badge */}
      <span
        className="absolute top-3 right-3 text-xs font-mono tabular-nums px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}
      >
        {menu.count}
      </span>

      {/* Amount */}
      <p
        className="font-black text-white tabular-nums leading-tight"
        style={{ fontSize: 'clamp(1.6rem, 5.5vmin, 2.4rem)' }}
      >
        {menu.displayAmount.toLocaleString()}
        <span className="text-sm font-normal ml-1 text-white/45">원</span>
      </p>

      {/* Name */}
      <p
        className="font-semibold text-white/70 mt-2"
        style={{ fontSize: 'clamp(0.9rem, 2.6vmin, 1.05rem)' }}
      >
        {menu.name}
      </p>
    </button>
  )
}
