'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: '실시간 거래관리' },
  { href: '/admin/transactions', label: '거래내역 조회' },
  { href: '/admin/menus', label: '메뉴 설정' },
  { href: '/admin/device', label: '단말기 설정' },
  { href: '/admin/count', label: '식수 카운트' },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

export function AdminSidebar() {
  const isActive = useIsActive()
  return (
    <aside
      className="hidden md:flex flex-col w-52 lg:w-60 flex-shrink-0 border-r border-white/10"
      style={{ background: 'rgba(5,14,31,0.40)', backdropFilter: 'blur(8px)' }}
    >
      <nav className="flex flex-col p-3 gap-1 pt-4">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-4 py-3.5 rounded-xl text-base font-medium whitespace-nowrap transition-all ${
              isActive(item.href)
                ? 'bg-blue-500/25 text-white border border-blue-400/40'
                : 'text-white/55 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

export function AdminMobileNav() {
  const isActive = useIsActive()
  return (
    <nav
      className="md:hidden border-b border-white/10 px-2 overflow-x-auto flex-shrink-0"
      style={{ background: 'rgba(5,14,31,0.40)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex gap-0.5 min-w-max">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-3.5 text-base font-medium whitespace-nowrap border-b-2 transition-all ${
              isActive(item.href)
                ? 'text-white border-blue-400 bg-white/5'
                : 'text-white/50 border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
