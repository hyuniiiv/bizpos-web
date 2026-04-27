'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'

export default function AddTerminalButton({ merchantId: _ }: { merchantId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [terminalType, setTerminalType] = useState('ticket_checker')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ termId: string; pin: string } | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/terminals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, terminal_type: terminalType }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '오류가 발생했습니다')
      setLoading(false)
      return
    }

    const data = await res.json()
    setCreated({ termId: data.term_id, pin: data.initialPin ?? '1234' })
    setLoading(false)
    router.refresh()
  }

  const handleClose = () => {
    setOpen(false)
    setCreated(null)
    setName('')
    setTerminalType('ticket_checker')
    setError('')
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
            {created ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">단말기 추가 완료</h2>
                <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">단말기 ID</span>
                    <span className="text-base font-mono font-semibold text-white">{created.termId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">초기 관리자 PIN</span>
                    <span className="text-2xl font-mono font-bold text-blue-300 tracking-widest">{created.pin}</span>
                  </div>
                </div>
                <p className="text-xs text-white/40">단말기 설정에서 PIN을 변경할 수 있습니다.</p>
                <button onClick={handleClose}
                  className="w-full rounded-lg py-3 text-base text-white transition-all"
                  style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
                  확인
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white mb-4">단말기 추가</h2>
                <form onSubmit={handleAdd} className="space-y-3">
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
                  <p className="text-xs text-white/40">단말기 ID는 가맹점 내 순차 자동 부여됩니다.</p>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={handleClose}
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
