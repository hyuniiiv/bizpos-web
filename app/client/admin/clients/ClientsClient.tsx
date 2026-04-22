'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Building, Users } from 'lucide-react'
import type { ClientRow } from './page'

type FormData = {
  client_name: string
  biz_no: string
  is_active: boolean
}

const EMPTY_FORM: FormData = { client_name: '', biz_no: '', is_active: true }

export default function ClientsClient({
  clients,
  isPlatformAdmin,
}: {
  clients: ClientRow[]
  isPlatformAdmin: boolean
}) {
  const router = useRouter()
  const [list, setList] = useState<ClientRow[]>(clients)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; target?: ClientRow } | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openAdd() {
    setForm(EMPTY_FORM)
    setError('')
    setModal({ mode: 'add' })
  }

  function openEdit(c: ClientRow) {
    setForm({ client_name: c.client_name, biz_no: c.biz_no, is_active: c.is_active })
    setError('')
    setModal({ mode: 'edit', target: c })
  }

  function closeModal() {
    setModal(null)
    setError('')
  }

  async function handleSave() {
    if (!form.client_name.trim()) { setError('고객사명을 입력하세요.'); return }
    if (!form.biz_no.trim()) { setError('사업자번호를 입력하세요.'); return }
    setSaving(true)
    setError('')
    try {
      if (modal?.mode === 'add') {
        const res = await fetch('/api/client/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '저장 실패')
        setList(prev => [...prev, json.data].sort((a, b) => a.client_name.localeCompare(b.client_name)))
      } else if (modal?.target) {
        const res = await fetch('/api/client/clients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: modal.target.id, ...form }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '저장 실패')
        setList(prev =>
          prev.map(c => c.id === modal.target!.id ? json.data : c)
            .sort((a, b) => a.client_name.localeCompare(b.client_name))
        )
      }
      closeModal()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  async function handleManageMembers(clientDbId: string) {
    await fetch('/api/portal/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client', id: clientDbId }),
    })
    router.push('/client/admin/members')
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}' 고객사를 삭제하시겠습니까?\n연관된 사원·식수 데이터도 함께 삭제됩니다.`)) return
    try {
      const res = await fetch('/api/client/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error ?? '삭제 실패')
        return
      }
      setList(prev => prev.filter(c => c.id !== id))
      router.refresh()
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">고객사 관리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            {isPlatformAdmin ? `전체 ${list.length}개 고객사` : '내 고객사 정보'}
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80"
            style={{ background: '#06D6A0' }}
          >
            <Plus className="w-4 h-4" />
            고객사 추가
          </button>
        )}
      </div>

      {isPlatformAdmin ? (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bp-border)', color: 'var(--bp-text-3)' }}>
                <th className="text-left px-4 py-3 font-medium">고객사명</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">사업자번호</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">상태</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">등록일</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12" style={{ color: 'var(--bp-text-3)' }}>
                    등록된 고객사가 없습니다.
                  </td>
                </tr>
              ) : list.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--bp-border)' }}>
                  <td className="px-4 py-3 font-medium text-white">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 flex-shrink-0" style={{ color: '#06D6A0' }} />
                      {c.client_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--bp-text-3)' }}>{c.biz_no}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: c.is_active ? 'rgba(6,214,160,0.12)' : 'rgba(255,255,255,0.06)',
                        color: c.is_active ? '#06D6A0' : 'var(--bp-text-3)',
                      }}
                    >
                      {c.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: 'var(--bp-text-3)' }}>
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => handleManageMembers(c.id)} className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/20 hover:text-blue-400" style={{ color: 'var(--bp-text-3)' }} title="멤버 관리">
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: 'var(--bp-text-3)' }} title="수정">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.client_name)} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--bp-text-3)' }} title="삭제">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-w-lg">
          {list.length === 0 ? (
            <div className="p-8 rounded-xl text-center" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', color: 'var(--bp-text-3)' }}>
              등록된 고객사 정보가 없습니다.
            </div>
          ) : list.map(c => (
            <div key={c.id} className="p-6 rounded-xl" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,214,160,0.12)' }}>
                    <Building className="w-5 h-5" style={{ color: '#06D6A0' }} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{c.client_name}</p>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1"
                      style={{
                        background: c.is_active ? 'rgba(6,214,160,0.12)' : 'rgba(255,255,255,0.06)',
                        color: c.is_active ? '#06D6A0' : 'var(--bp-text-3)',
                      }}
                    >
                      {c.is_active ? '활성' : '비활성'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManageMembers(c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-blue-500/20 hover:text-blue-400"
                    style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
                  >
                    <Users className="w-3 h-3" />멤버 관리
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                    style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
                  >
                    <Pencil className="w-3 h-3" />수정
                  </button>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                {[
                  { label: '사업자번호', value: c.biz_no },
                  { label: '등록일', value: new Date(c.created_at).toLocaleDateString('ko-KR') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt style={{ color: 'var(--bp-text-3)' }}>{label}</dt>
                    <dd className="text-white font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">{modal.mode === 'add' ? '고객사 추가' : '고객사 수정'}</h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--bp-text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                  고객사명<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={e => setForm(prev => ({ ...prev, client_name: e.target.value }))}
                  placeholder="(주)비즈플레이"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                  사업자번호<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={form.biz_no}
                  onChange={e => setForm(prev => ({ ...prev, biz_no: e.target.value }))}
                  placeholder="000-00-00000"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                />
              </div>
              {isPlatformAdmin && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium" style={{ color: 'var(--bp-text-3)' }}>활성 상태</label>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{ background: form.is_active ? '#06D6A0' : 'rgba(255,255,255,0.15)' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ transform: form.is_active ? 'translateX(21px)' : 'translateX(2px)' }}
                    />
                  </button>
                  <span className="text-xs" style={{ color: form.is_active ? '#06D6A0' : 'var(--bp-text-3)' }}>
                    {form.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              )}
            </div>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 mt-6">
              <button onClick={closeModal} className="flex-1 py-2 rounded-lg text-sm transition-colors hover:bg-white/10" style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}>
                취소
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: '#06D6A0' }}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
