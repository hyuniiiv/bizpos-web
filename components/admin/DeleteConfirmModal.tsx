'use client'

import { useState } from 'react'

interface DeleteConfirmModalProps {
  title: string
  description: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function DeleteConfirmModal({
  title,
  description,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!password) { setError('비밀번호를 입력하세요'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '비밀번호 확인 실패'); return }
      await onConfirm()
      onClose()
    } catch {
      setError('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--bp-surface)', border: '1px solid rgba(239,68,68,0.35)' }}>
        <div className="text-2xl mb-3">⚠️</div>
        <h3 className="text-base font-bold text-white mb-1">{title}</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--bp-text-3)' }}>{description}</p>

        <label className="block text-xs font-medium text-white mb-1.5">계정 비밀번호 확인</label>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="비밀번호 입력"
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none mb-1"
          style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
        />
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        {!error && <div className="mb-3" />}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm transition-colors hover:bg-white/10 disabled:opacity-50"
            style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !password}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.40)', border: '1px solid rgba(239,68,68,0.60)' }}
          >
            {loading ? '확인 중...' : '삭제 확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
