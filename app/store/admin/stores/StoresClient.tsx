'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Building2, Users } from 'lucide-react'
import type { Merchant } from './page'

type FormData = {
  name: string
  biz_no: string
  merchant_id: string
  contact_email: string
}

const EMPTY_FORM: FormData = { name: '', biz_no: '', merchant_id: '', contact_email: '' }

export default function StoresClient({
  merchants,
  isPlatformAdmin,
}: {
  merchants: Merchant[]
  isPlatformAdmin: boolean
}) {
  const router = useRouter()
  const [list, setList] = useState<Merchant[]>(merchants)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; target?: Merchant } | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openAdd() {
    setForm(EMPTY_FORM)
    setError('')
    setModal({ mode: 'add' })
  }

  function openEdit(m: Merchant) {
    setForm({
      name: m.name,
      biz_no: m.biz_no ?? '',
      merchant_id: m.merchant_id ?? '',
      contact_email: m.contact_email ?? '',
    })
    setError('')
    setModal({ mode: 'edit', target: m })
  }

  function closeModal() {
    setModal(null)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('매장명을 입력하세요.'); return }
    setSaving(true)
    setError('')
    try {
      if (modal?.mode === 'add') {
        const res = await fetch('/api/merchant/stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '저장 실패')
        setList(prev => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)))
      } else if (modal?.target) {
        const res = await fetch('/api/merchant/stores', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: modal.target.id, ...form }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '저장 실패')
        setList(prev =>
          prev.map(m => m.id === modal.target!.id ? json.data : m)
            .sort((a, b) => a.name.localeCompare(b.name))
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

  async function handleManageMembers(merchantDbId: string) {
    await fetch('/api/portal/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'merchant', id: merchantDbId }),
    })
    router.push('/store/admin/members')
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}' 매장을 삭제하시겠습니까?\n연관된 단말기·거래내역도 함께 삭제됩니다.`)) return
    try {
      const res = await fetch('/api/merchant/stores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error ?? '삭제 실패')
        return
      }
      setList(prev => prev.filter(m => m.id !== id))
      router.refresh()
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">매장 관리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            {isPlatformAdmin ? `전체 ${list.length}개 매장` : '내 매장 정보'}
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80"
            style={{ background: '#06D6A0' }}
          >
            <Plus className="w-4 h-4" />
            매장 추가
          </button>
        )}
      </div>

      {isPlatformAdmin ? (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bp-border)', color: 'var(--bp-text-2)' }}>
                <th className="text-left px-4 py-3 font-medium">매장명</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">사업자번호</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">가맹점 ID</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">담당자 이메일</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">등록일</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: 'var(--bp-text-3)' }}>
                    등록된 매장이 없습니다.
                  </td>
                </tr>
              ) : list.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--bp-border)' }}>
                  <td className="px-4 py-3 font-medium text-white">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: '#06D6A0' }} />
                      {m.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--bp-text-2)' }}>{m.biz_no ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--bp-text-2)' }}>{m.merchant_id ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--bp-text-2)' }}>{m.contact_email ?? '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs" style={{ color: 'var(--bp-text-2)' }}>
                    {new Date(m.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => handleManageMembers(m.id)} className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/20 hover:text-blue-400" style={{ color: 'var(--bp-text-3)' }} title="멤버 관리">
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: 'var(--bp-text-3)' }} title="수정">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(m.id, m.name)} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--bp-text-3)' }} title="삭제">
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
              등록된 매장 정보가 없습니다.
            </div>
          ) : list.map(m => (
            <div key={m.id} className="p-6 rounded-xl" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,214,160,0.12)' }}>
                    <Building2 className="w-5 h-5" style={{ color: '#06D6A0' }} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{m.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>내 매장</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManageMembers(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-blue-500/20 hover:text-blue-400"
                    style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
                  >
                    <Users className="w-3 h-3" />멤버 관리
                  </button>
                  <button
                    onClick={() => openEdit(m)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                    style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
                  >
                    <Pencil className="w-3 h-3" />수정
                  </button>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                {[
                  { label: '사업자번호', value: m.biz_no },
                  { label: '가맹점 ID', value: m.merchant_id },
                  { label: '담당자 이메일', value: m.contact_email },
                  { label: '등록일', value: new Date(m.created_at).toLocaleDateString('ko-KR') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt style={{ color: 'var(--bp-text-3)' }}>{label}</dt>
                    <dd className="text-white font-medium">{value ?? '—'}</dd>
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
              <h2 className="text-base font-bold text-white">{modal.mode === 'add' ? '매장 추가' : '매장 수정'}</h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--bp-text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'name', label: '매장명', placeholder: '(주)비즈플레이 강남점', required: true },
                { key: 'biz_no', label: '사업자번호', placeholder: '000-00-00000' },
                { key: 'merchant_id', label: '가맹점 ID', placeholder: 'M00000000' },
                { key: 'contact_email', label: '담당자 이메일', placeholder: 'contact@example.com' },
              ].map(({ key, label, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                    {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input
                    type="text"
                    value={form[key as keyof FormData]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                  />
                </div>
              ))}
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
