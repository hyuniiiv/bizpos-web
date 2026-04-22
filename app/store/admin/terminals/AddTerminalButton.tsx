'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'

export default function AddTerminalButton({ merchantId: _ }: { merchantId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [termId, setTermId] = useState('')
  const [name, setName] = useState('')
  const [corner, setCorner] = useState('')
  const [terminalType, setTerminalType] = useState('ticket_checker')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termId) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/terminals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termId, name, corner, terminal_type: terminalType }),
    })

    if (!res.ok) {
      const data = await res.json()
      const msg: string = data.error?.message ?? ''
      setError(msg.includes('duplicate') || msg.includes('unique') ? '이미 사용 중인 단말기 ID입니다.' : msg || '오류가 발생했습니다')
      setLoading(false)
      return
    }

    setOpen(false)
    setTermId('')
    setName('')
    setCorner('')
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-3 rounded-lg text-base text-white transition-all"
        style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}
      >
        + 단말기 추가
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-strong rounded-xl p-6 w-80">
            <h2 className="text-xl font-semibold text-white mb-4">단말기 추가</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-base text-white/60 mb-1.5">단말기 ID (숫자)</label>
                <input type="number" value={termId} onChange={e => setTermId(e.target.value)}
                  min={1} max={99} required className={inputCls} style={inputStyle} placeholder="1" />
              </div>
              <div>
                <label className="block text-base text-white/60 mb-1.5">단말기 이름</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="1번 단말기" />
              </div>
              <div>
                <label className="block text-base text-white/60 mb-1.5">단말기 타입</label>
                <select value={terminalType} onChange={e => setTerminalType(e.target.value)}
                  className={inputCls} style={{ ...inputStyle, background: 'rgba(255,255,255,0.10)' }}>
                  <option value="ticket_checker" style={{ background: '#0F1B4C' }}>식권체크기</option>
                  <option value="pos" style={{ background: '#0F1B4C' }}>POS</option>
                  <option value="kiosk" style={{ background: '#0F1B4C' }}>KIOSK</option>
                  <option value="table_order" style={{ background: '#0F1B4C' }}>테이블 오더</option>
                </select>
              </div>
              <div>
                <label className="block text-base text-white/60 mb-1.5">코너명</label>
                <input value={corner} onChange={e => setCorner(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="A코너" />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg py-3 text-base text-white/60 hover:text-white/80 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
                  취소
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-lg py-3 text-base text-white disabled:opacity-50 transition-all"
                  style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
                  {loading ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
