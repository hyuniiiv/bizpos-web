'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
    >
      <LogOut className="w-4 h-4 flex-shrink-0" />
      <span className="hidden lg:inline">로그아웃</span>
    </button>
  )
}
