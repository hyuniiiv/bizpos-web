'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, ShieldCheck, KeyRound } from 'lucide-react'
import type { Member } from './page'
import { CLIENT_ASSIGNABLE as ASSIGNABLE, NEEDS_PASSWORD_ROLES as NEEDS_PASSWORD } from '@/lib/roles/assignable'

const ROLE_LABEL: Record<string, string> = {
  platform_client_admin: '관리자',
  client_admin: '고객사관리자',
  client_operator: '고객사운영자',
}

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  platform_client_admin: { bg: 'rgba(6,214,160,0.12)', color: '#06D6A0' },
  client_admin:          { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  client_operator:       { bg: 'rgba(255,255,255,0.06)', color: 'var(--bp-text-3)' },
}


type FormData = { email: string; password: string; role: string }

export default function ClientMembersClient({
  members: initial,
  myRole,
  clientId,
  currentUserId,
}: {
  members: Member[]
  myRole: string
  clientId: string
  currentUserId: string
}) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initial)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormData>({ email: '', password: '', role: ASSIGNABLE[myRole]?.[0] ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [pwTargetId, setPwTargetId] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const assignable = ASSIGNABLE[myRole] ?? []
  const canManage = assignable.length > 0

  function openModal() {
    setForm({ email: '', password: '', role: assignable[0] ?? '' })
    setError('')
    setShowModal(true)
  }

  function openPwModal(id: string) {
    setPwTargetId(id)
    setNewPw('')
    setPwError('')
  }

  async function handleAdd() {
    if (!form.email.trim()) { setError('이메일을 입력하세요.'); return }
    if (NEEDS_PASSWORD.has(form.role) && !form.password.trim()) { setError('비밀번호를 입력하세요.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/client/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, client_id: clientId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '추가 실패')
      setMembers(prev => [...prev, json.data])
      setShowModal(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '추가 실패')
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(id: string, role: string) {
    const res = await fetch('/api/client/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error ?? '수정 실패'); return }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: json.data.role } : m))
    router.refresh()
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`'${email}' 멤버를 제거하시겠습니까?`)) return
    const res = await fetch('/api/client/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error ?? '삭제 실패'); return }
    setMembers(prev => prev.filter(m => m.id !== id))
    router.refresh()
  }

  async function handlePasswordReset() {
    if (!newPw.trim()) { setPwError('새 비밀번호를 입력하세요.'); return }
    if (newPw.length < 8) { setPwError('비밀번호는 8자 이상이어야 합니다.'); return }
    setPwSaving(true); setPwError('')
    try {
      const res = await fetch('/api/client/members/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pwTargetId, newPassword: newPw }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '변경 실패')
      setPwTargetId(null)
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : '변경 실패')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">권한 관리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            멤버 {members.length}명 · 내 역할:{' '}
            <span style={{ color: '#06D6A0' }}>{ROLE_LABEL[myRole]}</span>
          </p>
        </div>
        {canManage && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80"
            style={{ background: '#06D6A0' }}
          >
            <Plus className="w-4 h-4" />멤버 추가
          </button>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bp-border)', color: 'var(--bp-text-3)' }}>
              <th className="text-left px-4 py-3 font-medium">이메일 (ID)</th>
              <th className="text-left px-4 py-3 font-medium">역할</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">등록일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12" style={{ color: 'var(--bp-text-3)' }}>멤버가 없습니다.</td>
              </tr>
            ) : members.map(m => {
              const rc = ROLE_COLOR[m.role] ?? ROLE_COLOR.client_operator
              const canEdit = ASSIGNABLE[myRole]?.includes(m.role)
              const isSelf = m.user_id === currentUserId
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--bp-border)' }}>
                  <td className="px-4 py-3 text-white">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: rc.color }} />
                      {m.email}
                      {isSelf && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(6,214,160,0.12)', color: '#06D6A0' }}>나</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && !isSelf && assignable.length > 1 ? (
                      <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.id, e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: rc.bg, color: rc.color, border: 'none', outline: 'none' }}
                      >
                        {assignable.map(r => (
                          <option key={r} value={r} style={{ background: '#1e2533', color: '#fff' }}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={rc}>
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs" style={{ color: 'var(--bp-text-3)' }}>
                    {new Date(m.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canEdit && !isSelf && NEEDS_PASSWORD.has(m.role) && (
                        <button
                          onClick={() => openPwModal(m.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/20 hover:text-blue-400"
                          style={{ color: 'var(--bp-text-3)' }}
                          title="비밀번호 재설정"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canEdit && !isSelf && (
                        <button
                          onClick={() => handleDelete(m.id, m.email)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 hover:text-red-400"
                          style={{ color: 'var(--bp-text-3)' }}
                          title="제거"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 멤버 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">멤버 추가</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--bp-text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                  역할<span className="text-red-400 ml-0.5">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm(prev => ({ ...prev, role: e.target.value, password: '' }))}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                >
                  {assignable.map(r => (
                    <option key={r} value={r} style={{ background: '#1e2533' }}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                  이메일 (ID)<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                />
              </div>
              {NEEDS_PASSWORD.has(form.role) ? (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                    임시 비밀번호<span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="8자 이상 입력"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                  />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--bp-text-3)' }}>
                    ID/PW 기반 계정이 생성됩니다. 사용자에게 별도 전달하세요.
                  </p>
                </div>
              ) : (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(6,214,160,0.08)', color: '#06D6A0' }}>
                  시스템관리자는 이미 가입된 이메일 계정을 연결합니다.
                </p>
              )}
            </div>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg text-sm hover:bg-white/10" style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}>
                취소
              </button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-black hover:opacity-80 disabled:opacity-50" style={{ background: '#06D6A0' }}>
                {saving ? '추가 중…' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 재설정 모달 */}
      {pwTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">비밀번호 재설정</h2>
              <button onClick={() => setPwTargetId(null)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--bp-text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                새 비밀번호<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="8자 이상 입력"
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
              />
              <p className="text-xs mt-1.5" style={{ color: 'var(--bp-text-3)' }}>
                변경 후 사용자에게 새 비밀번호를 별도 전달하세요.
              </p>
            </div>
            {pwError && <p className="mt-3 text-xs text-red-400">{pwError}</p>}
            <div className="flex gap-2 mt-6">
              <button onClick={() => setPwTargetId(null)} className="flex-1 py-2 rounded-lg text-sm hover:bg-white/10" style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}>
                취소
              </button>
              <button onClick={handlePasswordReset} disabled={pwSaving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-black hover:opacity-80 disabled:opacity-50" style={{ background: '#06D6A0' }}>
                {pwSaving ? '변경 중…' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
