'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    router.push('/portal')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--pos-bg-gradient)' }}>
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: '#06D6A0' }}>
              <span className="text-black font-black text-base leading-none">B</span>
            </div>
            <span className="text-3xl font-black tracking-tight text-white">BIZPOS</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--bp-text-3)' }}>식권 결제 관리 시스템</p>
        </div>

        {/* 폼 카드 */}
        <div className="bp-card rounded-2xl p-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ color: 'var(--bp-text-3)' }}>관리자 로그인</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5"
                     style={{ color: 'var(--bp-text-2)' }}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all"
                style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5"
                     style={{ color: 'var(--bp-text-2)' }}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all"
                style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
              />
            </div>
            {error && (
              <p className="text-xs p-3 rounded-lg"
                 style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.20)' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: '#06D6A0', color: '#0a1628' }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
