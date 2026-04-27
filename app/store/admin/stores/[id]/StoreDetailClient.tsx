'use client'

import { useRouter } from 'next/navigation'
import { Trash2, Pencil, ArrowLeft, Plus } from 'lucide-react'
import { useState } from 'react'

interface Terminal {
  id: string
  term_id: string
  name: string
  status: 'online' | 'offline'
  created_at: string
}

interface StoreData {
  id: string
  store_name: string
  merchant_id: string
  address: string
  is_active: boolean
  description: string | null
  created_at: string
}

interface StoreManager {
  id: string
  user_id: string
  email: string
  role: string
  created_at: string
}

interface StoreDetailClientProps {
  store: StoreData
  terminals: Terminal[]
  managers: StoreManager[]
  canEdit: boolean
  canDelete: boolean
}

type EditForm = { store_name: string; address: string; is_active: boolean; description: string }

export default function StoreDetailClient({
  store,
  terminals,
  managers,
  canEdit,
  canDelete,
}: StoreDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'detail' | 'permission'>('detail')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFormData, setAddFormData] = useState({ email: '', password: '', role: 'store_manager' })
  const [isLoading, setIsLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm>({
    store_name: store.store_name,
    address: store.address ?? '',
    is_active: store.is_active,
    description: store.description ?? '',
  })

  async function handleSave() {
    if (!form.store_name.trim()) { alert('매장명을 입력하세요.'); return }
    if (!confirm('저장하시겠습니까?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/merchant/store-locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: store.id, ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '저장 실패')
      setEditing(false)
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setEditing(false)
    setForm({ store_name: store.store_name, address: store.address ?? '', is_active: store.is_active, description: store.description ?? '' })
  }

  const handleDelete = () => {
    if (!confirm(`'${store.store_name}' 매장을 삭제하시겠습니까?`)) return

    fetch('/api/merchant/stores', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: store.id }),
    })
      .then(res => res.json())
      .then(json => {
        if (!json.error) {
          alert('삭제되었습니다')
          router.push('/store/admin/stores')
        } else {
          alert(json.error)
        }
      })
      .catch(err => alert(err.message))
  }

  const handleAddManager = async () => {
    if (!addFormData.email.trim() || !addFormData.password.trim()) {
      alert('이메일과 비밀번호를 입력하세요.')
      return
    }

    if (!confirm('저장하시겠습니까?')) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/merchant/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addFormData.email,
          password: addFormData.password,
          role: addFormData.role,
          store_id: store.id,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || '매니저 추가 중 오류가 발생했습니다.')
        return
      }

      alert('등록되었습니다.')
      setShowAddModal(false)
      setAddFormData({ email: '', password: '', role: 'store_manager' })
      router.refresh()
    } catch (err) {
      alert('매니저 추가 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteManager = async (managerId: string) => {
    try {
      const response = await fetch('/api/merchant/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: managerId }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || '매니저 삭제 중 오류가 발생했습니다.')
        return
      }

      alert('매니저가 삭제되었습니다.')
      router.refresh()
    } catch (err) {
      alert('매니저 삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.back()}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--bp-text-3)' }} />
            </button>
            <h1 className="text-2xl font-bold text-white">{store.store_name}</h1>
          </div>
          <p className="text-sm ml-10" style={{ color: 'var(--bp-text-3)' }}>
            매장 상세 정보
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
            >
              <Pencil className="w-4 h-4" />
              수정
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-400 transition-opacity hover:opacity-80"
              style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 탭 UI */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
        {(['detail', 'permission'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? 'var(--bp-primary)' : 'transparent',
              color: activeTab === tab ? 'var(--bp-primary-fg)' : 'var(--bp-text-3)',
            }}
          >
            {tab === 'detail' ? '상세정보' : '권한관리'}
          </button>
        ))}
      </div>

      {/* 상세정보 탭 */}
      {activeTab === 'detail' && (
        <>
          <div
            className="rounded-xl p-6"
            style={{
              background: 'var(--bp-surface)',
              border: '1px solid var(--bp-border)',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>매장명</label>
                {editing ? (
                  <input value={form.store_name} onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }} />
                ) : (
                  <p className="text-white font-medium">{store.store_name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>상태</label>
                {editing ? (
                  <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${form.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {form.is_active ? '운영중' : '비운영'} (클릭하여 변경)
                  </button>
                ) : (
                  <span className={`text-sm font-medium px-3 py-1 rounded ${store.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {store.is_active ? '운영중' : '비운영'}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>주소</label>
                {editing ? (
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }} />
                ) : (
                  <p className="text-white font-medium">{store.address || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>등록일</label>
                <p className="text-white font-medium">{new Date(store.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            </div>

            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--bp-border)' }}>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>설명</label>
              {editing ? (
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="선택 입력"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }} />
              ) : (
                <p className="text-white whitespace-pre-wrap">{store.description || '-'}</p>
              )}
            </div>

            {editing && (
              <div className="flex gap-2 mt-6 pt-4" style={{ borderTop: '1px solid var(--bp-border)' }}>
                <button onClick={cancelEdit}
                  className="flex-1 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
                  style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}>
                  취소
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>
            )}
          </div>

          {/* 단말기 목록 섹션 */}
          {terminals.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">단말기 목록 ({terminals.length}개)</h2>
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--bp-surface)',
                  border: '1px solid var(--bp-border)',
                }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--bp-border)',
                        color: 'var(--bp-text-3)',
                      }}
                    >
                      <th className="text-left px-4 py-3 font-medium">단말기명</th>
                      <th className="text-left px-4 py-3 font-medium">단말기ID</th>
                      <th className="text-left px-4 py-3 font-medium">상태</th>
                      <th className="text-left px-4 py-3 font-medium">등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminals.map(terminal => (
                      <tr
                        key={terminal.id}
                        style={{ borderBottom: '1px solid var(--bp-border)' }}
                      >
                        <td className="px-4 py-3 text-white font-medium">{terminal.name}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--bp-text-3)' }}>
                          {terminal.term_id}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${
                              terminal.status === 'online'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {terminal.status === 'online' ? '온라인' : '오프라인'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--bp-text-3)' }}>
                          {new Date(terminal.created_at).toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {terminals.length === 0 && (
            <div
              className="rounded-xl p-8 text-center"
              style={{
                background: 'var(--bp-surface)',
                border: '1px solid var(--bp-border)',
                color: 'var(--bp-text-3)',
              }}
            >
              등록된 단말기가 없습니다.
            </div>
          )}
        </>
      )}

      {/* 권한관리 탭 */}
      {activeTab === 'permission' && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">관리자/매니저 관리</h2>
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
          >
            {managers.length > 0 ? (
              <div className="mb-6 space-y-2">
                {managers.map(manager => (
                  <div
                    key={manager.id}
                    className="flex items-center justify-between p-2 rounded"
                    style={{ background: 'var(--bp-surface-2)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm">{manager.email}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{
                          background: manager.role === 'store_admin' ? 'color-mix(in srgb, var(--bp-primary) 12%, transparent)' : 'rgba(255,255,255,0.08)',
                          color: manager.role === 'store_admin' ? 'var(--bp-primary)' : 'var(--bp-text-3)',
                        }}>
                          {manager.role === 'store_admin' ? '관리자' : '매니저'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
                        {new Date(manager.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => { if (confirm('삭제하시겠습니까?')) handleDeleteManager(manager.id) }}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm mb-6" style={{ color: 'var(--bp-text-3)' }}>등록된 관리자/매니저가 없습니다.</p>
            )}

            {canEdit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
                style={{ background: 'var(--bp-primary)', border: '1px solid var(--bp-border)' }}
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            )}
          </div>
        </div>
      )}

      {/* 신규 매니저 추가 모달 — 탭 조건 밖에서 항상 렌더링 가능 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
          >
            <h3 className="text-lg font-bold text-white mb-4">관리자/매니저 추가</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white mb-1">역할</label>
                <select
                  value={addFormData.role}
                  onChange={e => setAddFormData({ ...addFormData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)', color: 'white' }}
                >
                  <option value="store_admin">관리자 (store_admin)</option>
                  <option value="store_manager">매니저 (store_manager)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white mb-1">이메일</label>
                <input
                  type="email"
                  placeholder="manager@example.com"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{
                    background: 'var(--bp-surface-2)',
                    border: '1px solid var(--bp-border)',
                    color: 'white',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white mb-1">비밀번호</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={addFormData.password}
                  onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{
                    background: 'var(--bp-surface-2)',
                    border: '1px solid var(--bp-border)',
                    color: 'white',
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
                style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)' }}
              >
                취소
              </button>
              <button
                onClick={handleAddManager}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--bp-primary)' }}
              >
                {isLoading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
