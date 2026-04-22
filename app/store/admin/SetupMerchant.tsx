'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupMerchant() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSetup = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/setup/merchant', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '초기화 실패')
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🏪</div>
      <h2 className="text-xl font-bold text-white mb-2">가맹점 초기 설정이 필요합니다</h2>
      <p className="text-sm text-white/60 mb-6 max-w-sm">
        처음 로그인하셨습니다. 아래 버튼을 눌러 가맹점 계정을 초기화하세요.
      </p>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <button
        onClick={handleSetup}
        disabled={loading}
        className="px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
        style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}
      >
        {loading ? '초기화 중...' : '가맹점 초기화 시작'}
      </button>
    </div>
  )
}
