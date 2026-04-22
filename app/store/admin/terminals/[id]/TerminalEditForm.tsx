'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TerminalType = 'ticket_checker' | 'pos' | 'kiosk' | 'table_order'

const TYPE_LABELS: Record<TerminalType, string> = {
  ticket_checker: '식권체크기',
  pos: 'POS',
  kiosk: 'KIOSK',
  table_order: '테이블 오더',
}

type Terminal = {
  id: string
  term_id: string
  name: string
  corner: string
  status: string
  terminal_type: TerminalType | null
  last_seen_at: string | null
  activation_code: string | null
  access_token: string | null
}

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'

export default function TerminalEditForm({ terminal }: { terminal: Terminal }) {
  const router = useRouter()
  const [name, setName] = useState(terminal.name ?? '')
  const [corner, setCorner] = useState(terminal.corner ?? '')
  const [termId, setTermId] = useState(terminal.term_id ?? '')
  const [terminalType, setTerminalType] = useState<TerminalType>(terminal.terminal_type ?? 'pos')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    const res = await fetch(`/api/terminals/${terminal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, corner, term_id: termId.padStart(2, '0'), terminal_type: terminalType }),
    })
    setSaving(false)
    if (!res.ok) { const data = await res.json(); setError(data.error ?? '저장 실패') }
    else { setSuccess(true); router.refresh() }
  }

  const handleRegenCode = async () => {
    if (!confirm('재발급하면 현재 단말기 연결이 끊어집니다. 계속하시겠습니까?')) return
    await fetch(`/api/terminals/${terminal.id}/revoke`, { method: 'POST' })
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const res = await fetch(`/api/terminals/${terminal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activation_code: newCode }),
    })
    if (res.ok) router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('단말기를 삭제하면 관련 거래내역도 모두 삭제됩니다. 계속하시겠습니까?')) return
    setDeleting(true)
    const res = await fetch(`/api/terminals/${terminal.id}`, { method: 'DELETE' })
    if (res.ok) { router.push('/store/admin/terminals'); router.refresh() }
    else { const data = await res.json(); setError(data.error ?? '삭제 실패'); setDeleting(false) }
  }

  return (
    <div className="space-y-4 w-full max-w-lg lg:max-w-2xl">
      {/* 현재 상태 */}
      <section className="glass-card rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">현재 상태</h2>
        <div className="grid grid-cols-2 gap-y-3 text-base">
          <span className="text-white/50">연결 상태</span>
          <span className={`font-medium ${terminal.status === 'online' ? 'text-green-400' : 'text-white/40'}`}>
            {terminal.status === 'online' ? '🟢 온라인' : '⚫ 오프라인'}
          </span>
          <span className="text-white/50">마지막 접속</span>
          <span className="text-white/70">
            {terminal.last_seen_at ? new Date(terminal.last_seen_at).toLocaleString('ko-KR') : '미접속'}
          </span>
          <span className="text-white/50">활성화 코드</span>
          <div className="flex items-center gap-2 flex-wrap">
            {terminal.access_token ? (
              <span className="text-sm text-green-400 font-medium">활성화 완료</span>
            ) : (
              <span className="font-mono text-yellow-300 px-2 py-1 rounded text-sm"
                    style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.30)' }}>
                {terminal.activation_code}
              </span>
            )}
            <button onClick={handleRegenCode} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">재발급</button>
          </div>
        </div>
      </section>

      {/* 편집 폼 */}
      <section className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">단말기 정보 편집</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-base text-white/60 mb-1.5">단말기 ID</label>
            <input type="number" value={parseInt(termId)} onChange={e => setTermId(e.target.value)}
              min={1} max={99} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-base text-white/60 mb-1.5">단말기 타입</label>
            <select value={terminalType} onChange={e => setTerminalType(e.target.value as TerminalType)}
              className={inputCls} style={{ ...inputStyle, background: 'rgba(255,255,255,0.10)' }}>
              {(Object.entries(TYPE_LABELS) as [TerminalType, string][]).map(([val, label]) => (
                <option key={val} value={val} style={{ background: '#0F1B4C' }}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-base text-white/60 mb-1.5">단말기 이름</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="1번 단말기" />
          </div>
          <div>
            <label className="block text-base text-white/60 mb-1.5">코너명</label>
            <input value={corner} onChange={e => setCorner(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="A코너" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">저장되었습니다.</p>}
          <button type="submit" disabled={saving}
            className="w-full rounded-lg py-3 text-base text-white disabled:opacity-50 transition-all"
            style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>
      </section>

      {/* 위험 구역 */}
      <section className="rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <h2 className="text-sm font-semibold text-red-400 mb-3">위험 구역</h2>
        <button onClick={handleDelete} disabled={deleting}
          className="px-4 py-3 rounded-lg text-base text-red-300 hover:text-red-200 disabled:opacity-50 transition-colors"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}>
          {deleting ? '삭제 중...' : '단말기 삭제'}
        </button>
      </section>
    </div>
  )
}
