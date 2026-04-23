'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getBrowserClient } from '@/lib/supabase/browser'

type Role = 'platform_admin' | 'merchant' | 'client' | null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getBrowserClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const metaRole = (session.user.app_metadata?.role as Role) ?? null
        setRole(metaRole)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole((session?.user?.app_metadata?.role as Role) ?? null)
    })

    return () => {
      subscription?.unsubscribe()
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
