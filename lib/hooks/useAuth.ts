'use client'

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getBrowserClient } from '@/lib/supabase/browser'

type Role = 'platform_admin' | 'merchant' | 'client' | null

function extractRole(session: Session | null): Role {
  const raw = session?.user?.app_metadata?.role
  if (raw === 'platform_admin' || raw === 'merchant' || raw === 'client') {
    return raw
  }
  return null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getBrowserClient()
    let cancelled = false

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      const session: Session | null = data.session
      setUser(session?.user ?? null)
      setRole(extractRole(session))
      setLoading(false)
    })()

    const { data: subData } = supabase.auth.onAuthStateChange(
      (_event, session: Session | null) => {
        setUser(session?.user ?? null)
        setRole(extractRole(session))
      }
    )

    return () => {
      cancelled = true
      subData.subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  }

  const signOut = async (): Promise<void> => {
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
  }

  return { user, role, loading, signIn, signOut }
}
