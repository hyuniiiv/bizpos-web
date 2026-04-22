'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type MerchantKey = { id: string; name: string; mid: string; is_active: boolean }
type Props = { terminalId: string; currentKeyId: string | null; merchantKeys: MerchantKey[] }

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none transition-all'

export default function TerminalKeyPanel({ terminalId, currentKeyId, merchantKeys }: Props) {
  const router = useRouter()
  const [selectedKeyId, setSelectedKeyId] = useState(currentKeyId ?? '')
  const [savingKey, setSavingKey] = useState(false)
  const [keyMsg, setKeyMsg] = useState('')
  const [accountId, setAccountId] = useState('')
  const [password, setPassword] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountMsg, setAccountMsg] = useState('')

  async function handleSaveKey() {
    setSavingKey(true); setKeyMsg('')
    const res = await fetch(`/api/terminals/${terminalId}/key`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantKeyId: selectedKeyId || null }),
    })
    setSavingKey(false)
    if (res.ok) { setKeyMsg('저장되었습니다'); router.refresh() }
    else setKeyMsg('저장 실패')
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!accountId || !password) return
    setSavingAccount(true); setAccountMsg('')
    const res = await fetch(`/api/terminals/${terminalId}/account`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terminalAccountId: accountId, password }),
    })
    setSavingAccount(false)
    if (res.ok) { setAccountMsg('계정이 설정되었습니다'); setAccountId(''); setPassword('') }
    else setAccountMsg('설정 실패')
  }

  return (
    <div className="space-y-4">
      {/* 비플페이 키 연결 */}
      <section className="glass-card rounded-xl p-5">
        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">비플페이 키 연결</h2>
        <div className="space-y-3">
          <select value={selectedKeyId} onChange={e => setSelectedKeyId(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-all"
            style={inputStyle}>
            <option value="" style={{ background: '#0F1B4C' }}>-- 연결 안 함 --</option>
            {merchantKeys.filter(k => k.is_active).map(k => (
              <option key={k.id} value={k.id} style={{ background: '#0F1B4C' }}>
                {k.name} ({k.mid})
              </option>
            ))}
          </select>
          {keyMsg && (
            <p className={`text-xs ${keyMsg.includes('실패') ? 'text-red-400' : 'text-green-400'}`}>{keyMsg}</p>
          )}
          <button onClick={handleSaveKey} disabled={savingKey}
            className="w-full rounded-lg py-2 text-sm text-white disabled:opacity-50 transition-all"
            style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
            {savingKey ? '저장 중...' : '키 연결 저장'}
          </button>
        </div>
      </section>

      {/* 단말기 계정 설정 */}
      <section className="glass-card rounded-xl p-5">
        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">단말기 계정 설정</h2>
        <form onSubmit={handleSaveAccount} className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">계정 ID</label>
            <input value={accountId} onChange={e => setAccountId(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="terminal_001" required />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="••••••••" required />
          </div>
          {accountMsg && (
            <p className={`text-xs ${accountMsg.includes('실패') ? 'text-red-400' : 'text-green-400'}`}>{accountMsg}</p>
          )}
          <button type="submit" disabled={savingAccount}
            className="w-full rounded-lg py-2 text-sm text-white disabled:opacity-50 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            {savingAccount ? '설정 중...' : '계정 설정'}
          </button>
        </form>
      </section>
    </div>
  )
}
