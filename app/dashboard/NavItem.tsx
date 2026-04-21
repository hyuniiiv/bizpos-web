'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Monitor,
  KeyRound,
  Receipt,
  BarChart3,
  Bell,
  Settings2,
  type LucideIcon,
} from 'lucide-react'

type NavEntry = {
  href: string
  label: string
  mobileLabel: string
  icon: LucideIcon
  alertKey?: boolean
}

const NAV_ITEMS: NavEntry[] = [
  { href: '/dashboard',              label: '대시보드',   mobileLabel: '대시보드', icon: LayoutDashboard },
  { href: '/dashboard/terminals',    label: '단말기 관리', mobileLabel: '단말기',   icon: Monitor },
  { href: '/dashboard/keys',         label: '키 관리',    mobileLabel: '키 관리',  icon: KeyRound },
  { href: '/dashboard/transactions', label: '거래내역',   mobileLabel: '거래내역', icon: Receipt },
  { href: '/dashboard/analytics',    label: '매출 분석',  mobileLabel: '매출분석', icon: BarChart3 },
  { href: '/dashboard/alerts',       label: '이상 알림',  mobileLabel: '알림',     icon: Bell, alertKey: true },
  { href: '/dashboard/settings',     label: '설정',       mobileLabel: '설정',     icon: Settings2 },
]

function checkActive(href: string, pathname: string) {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
}

export function SideNav({ alertCount }: { alertCount: number }) {
  const pathname = usePathname()
  return (
    <>
      {NAV_ITEMS.map(item => {
        const active = checkActive(item.href, pathname)
        const badge = item.alertKey ? alertCount : 0
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={{
              color: active ? '#06D6A0' : 'rgba(255,255,255,0.50)',
              background: active ? 'rgba(6,214,160,0.08)' : 'transparent',
            }}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden lg:inline truncate">{item.label}</span>
            </span>
            {badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold leading-none hidden lg:inline-flex flex-shrink-0">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )
}

export function MobileNav({ alertCount }: { alertCount: number }) {
  const pathname = usePathname()
  return (
    <>
      {NAV_ITEMS.map(item => {
        const active = checkActive(item.href, pathname)
        const badge = item.alertKey ? alertCount : 0
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
            style={{
              color: active ? '#06D6A0' : 'rgba(255,255,255,0.50)',
              background: active ? 'rgba(6,214,160,0.08)' : 'transparent',
            }}
          >
            <span>{item.mobileLabel}</span>
            {badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )
}
