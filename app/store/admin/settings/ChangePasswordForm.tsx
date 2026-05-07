'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none'
const inputStyle = { background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(false)
    if (next.length < 6) { setError('새 비밀번호는 6자 이상이어야 합니다'); return }
    if (next !== confirm) { setError('새 비밀번호가 일치하지 않습니다'); return }

    setLoading(true)
    try {
      const verifyRes = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: current }),
      })
      if (!verifyRes.ok) { setError('현재 비밀번호가 올바르지 않습니다'); return }

      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password: next })
      if (updateError) { setError(updateError.message); return }

      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--bp-text-3)' }}>현재 비밀번호</label>
        <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
          className={inputCls} style={inputStyle} placeholder="••••••••" required />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--bp-text-3)' }}>새 비밀번호</label>
        <input type="password" value={next} onChange={e => setNext(e.target.value)}
          className={inputCls} style={inputStyle} placeholder="6자 이상" required />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--bp-text-3)' }}>새 비밀번호 확인</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          className={inputCls} style={inputStyle} placeholder="••••••••" required />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-green-400">비밀번호가 변경되었습니다.</p>}
      <button type="submit" disabled={loading || !current || !next || !confirm}
        className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: 'var(--bp-primary)' }}>
        {loading ? '변경 중...' : '비밀번호 변경'}
      </button>
    </form>
  )
}
