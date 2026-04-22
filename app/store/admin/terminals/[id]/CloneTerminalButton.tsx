'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'

export default function CloneTerminalButton({
  configJson,
}: {
  configJson: Record<string, unknown> | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [termId, setTermId] = useState('')
  const [name, setName] = useState('')
  const [corner, setCorner] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termId) return
    setLoading(true)
    setError('')

    const createRes = await fetch('/api/terminals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termId, name, corner }),
    })

    if (!createRes.ok) {
      const data = await createRes.json()
      const msg: string = data.error?.message ?? data.error ?? ''
      setError(msg.includes('duplicate') || msg.includes('unique') ? '이미 사용 중인 단말기 ID입니다.' : msg || '생성 실패')
      setLoading(false)
      return
    }

    const newTerminal = await createRes.json()

    if (configJson) {
      await fetch(`/api/terminals/${newTerminal.id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...configJson, termId: String(termId).padStart(2, '0') }),
      })
    }

    setOpen(false)
    router.push(`/store/admin/terminals/${newTerminal.id}`)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-lg text-base text-white/60 hover:text-white/80 transition-colors text-left px-4"
        style={{ border: '1px dashed rgba(255,255,255,0.20)' }}
      >
        + 이 설정으로 단말기 추가
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-strong rounded-xl p-6 w-80">
            <h2 className="text-base font-semibold text-white mb-1">설정 복사하여 단말기 추가</h2>
            <p className="text-sm text-white/40 mb-4">메뉴·설정이 복사됩니다. 단말기 ID는 달라야 합니다.</p>
            <form onSubmit={handleClone} className="space-y-3">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">단말기 ID (숫자, 고유값)</label>
                <input type="number" value={termId} onChange={e => setTermId(e.target.value)}
                  min={1} max={99} required className={inputCls} style={inputStyle} placeholder="2" />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">단말기 이름</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="2번 단말기" />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">코너명</label>
                <input value={corner} onChange={e => setCorner(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="B코너" />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setOpen(false); setError('') }}
                  className="flex-1 rounded-lg py-3 text-base text-white/60 hover:text-white/80 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
                  취소
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-lg py-3 text-base text-white disabled:opacity-50 transition-all"
                  style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
                  {loading ? '생성 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
