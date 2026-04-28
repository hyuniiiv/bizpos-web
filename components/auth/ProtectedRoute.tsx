'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

interface Props {
  children: React.ReactNode
  requiredRole?: 'platform_admin' | 'terminal_admin' | 'merchant' | 'client'
  fallbackPath?: string
}

export function ProtectedRoute({ children, requiredRole, fallbackPath = '/login' }: Props) {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(`${fallbackPath}?next=${encodeURIComponent(pathname)}`)
      return
    }
    const allowed = !requiredRole
      || role === requiredRole
      || role === 'platform_admin'
      || (requiredRole === 'merchant' && role === 'terminal_admin')
    if (!allowed) {
      router.replace('/unauthorized')
    }
  }, [user, role, loading, requiredRole, router, pathname, fallbackPath])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }
  if (!user) return null
  const allowed = !requiredRole
    || role === requiredRole
    || role === 'platform_admin'
    || (requiredRole === 'merchant' && role === 'terminal_admin')
  if (!allowed) return null
  return <>{children}</>
}
