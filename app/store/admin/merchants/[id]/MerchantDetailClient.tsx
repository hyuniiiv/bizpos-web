'use client'

import { useRouter } from 'next/navigation'
import { Trash2, Pencil, Plus, Key, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import type { Merchant, Store } from '@/lib/context/MerchantStoreContext'
import type { MerchantKey } from './page'

type EditForm = { name: string; biz_no: string; address: string; description: string }

interface MerchantMember {
  id: string
  user_id: string
  email: string
  role: string
  created_at: string
}

interface Terminal {
  id: string
  term_id: string
  name: string
  status: 'online' | 'offline'
  store_id: string
  store_name: string
  created_at: string
}

interface AvailableUser {
  id: string
  email: string
}

type KeyForm = { name: string; mid: string; enc_key: string; online_ak: string; description: string; env: 'production' | 'development' }
const EMPTY_KEY: KeyForm = { name: '', mid: '', enc_key: '', online_ak: '', description: '', env: 'production' }

interface MerchantDetailClientProps {
  merchant: Merchant
  members: MerchantMember[]
  availableUsers: AvailableUser[]
  stores: Store[]
  terminals: Terminal[]
  merchantKeys: MerchantKey[]
  canEdit: boolean
  canDelete: boolean
}

export default function MerchantDetailClient({
  merchant,
  members,
  availableUsers,
  stores,
  terminals,
  merchantKeys: initialKeys,
  canEdit,
  canDelete,
}: MerchantDetailClientProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm>({
    name: merchant.name,
    biz_no: merchant.biz_no ?? '',
    address: merchant.address ?? '',
    description: merchant.description ?? '',
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTab, setAddTab] = useState<'existing' | 'new'>('existing')
  const [existingForm, setExistingForm] = useState({ user_id: '', role: 'merchant_admin' })
  const [addFormData, setAddFormData] = useState({ email: '', password: '', role: 'merchant_admin' })
  const [isLoading, setIsLoading] = useState(false)
  const [showAddStoreModal, setShowAddStoreModal] = useState(false)
  const [storeForm, setStoreForm] = useState({ store_name: '', address: '' })
  const [isStoreLoading, setIsStoreLoading] = useState(false)
  const [keys, setKeys] = useState<MerchantKey[]>(initialKeys)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyForm, setKeyForm] = useState<KeyForm>(EMPTY_KEY)
  const [isKeyLoading, setIsKeyLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'permission'>('detail')

  const admins = members.filter(m => m.role === 'merchant_admin')
  const managers = members.filter(m => m.role === 'merchant_manager')
  const adminEmail = admins.length > 0 ? admins[0].email : '미지정'
  const managerEmail = managers.length > 0 ? managers[0].email : '미지정'

  async function handleSave() {
    if (!form.name.trim()) { alert('가맹점명을 입력하세요.'); return }
    if (!confirm('저장하시겠습니까?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/merchant/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: merchant.id, ...form }),
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
    setForm({
      name: merchant.name,
      biz_no: merchant.biz_no ?? '',
      address: merchant.address ?? '',
      description: merchant.description ?? '',
    })
  }

  const handleMapExistingUser = async () => {
    if (!existingForm.user_id) {
      alert('사용자를 선택하세요.')
      return
    }

    const selected = availableUsers.find(u => u.id === existingForm.user_id)
    if (!selected) return

    if (!confirm('저장하시겠습니까?')) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/merchant/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selected.email,
          role: existingForm.role,
          merchant_id: merchant.id,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || '멤버 추가 중 오류가 발생했습니다.')
        return
      }

      alert('멤버가 설정되었습니다.')
      setShowAddModal(false)
      setExistingForm({ user_id: '', role: 'merchant_admin' })
      router.refresh()
    } catch (err) {
      alert('멤버 추가 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!addFormData.email.trim() || !addFormData.password.trim()) {
      alert('ID와 비밀번호를 입력하세요.')
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
          merchant_id: merchant.id,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || '멤버 추가 중 오류가 발생했습니다.')
        return
      }

      alert('멤버가 추가되었습니다.')
      setShowAddModal(false)
      setAddFormData({ email: '', password: '', role: 'merchant_admin' })
      router.refresh()
    } catch (err) {
      alert('멤버 추가 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    try {
      const response = await fetch('/api/merchant/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || '멤버 삭제 중 오류가 발생했습니다.')
        return
      }

      alert('멤버가 삭제되었습니다.')
      router.refresh()
    } catch (err) {
      alert('멤버 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleAddKey = async () => {
    const { name, mid, enc_key, online_ak } = keyForm
    if (!name || !mid || !enc_key || !online_ak) {
      alert('이름, MID, 암호화키, 인증키는 필수입니다.')
      return
    }
    if (!confirm('저장하시겠습니까?')) return
    setIsKeyLoading(true)
    try {
      const res = await fetch('/api/merchant/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...keyForm }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || '키 추가 중 오류가 발생했습니다.'); return }
      setKeys(prev => [data, ...prev])
      setShowKeyModal(false)
      setKeyForm(EMPTY_KEY)
    } catch {
      alert('키 추가 중 오류가 발생했습니다.')
    } finally {
      setIsKeyLoading(false)
    }
  }

const handleAddStore = async () => {
    if (!storeForm.store_name.trim()) {
      alert('매장명을 입력하세요.')
      return
    }

    if (!confirm('저장하시겠습니까?')) return
    setIsStoreLoading(true)
    try {
      const response = await fetch('/api/merchant/store-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: storeForm.store_name,
          address: storeForm.address || undefined,
          merchant_id: merchant.id,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || '매장 추가 중 오류가 발생했습니다.')
        return
      }

      alert('매장이 추가되었습니다.')
      setShowAddStoreModal(false)
      setStoreForm({ store_name: '', address: '' })
      router.refresh()
    } catch (err) {
      alert('매장 추가 중 오류가 발생했습니다.')
    } finally {
      setIsStoreLoading(false)
    }
  }

  const handleDelete = () => {
    if (!confirm(`'${merchant.name}' 가맹점을 삭제하시겠습니까?`)) return

    fetch('/api/merchant/merchants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: merchant.id }),
    })
      .then(res => res.json())
      .then(json => {
        if (!json.error) {
          alert('삭제되었습니다')
          router.push('/store/admin/merchants')
        } else {
          alert(json.error)
        }
      })
      .catch(err => alert(err.message))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--bp-text-3)' }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{merchant.name}</h1>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--bp-text-3)' }}
            >
              가맹점 상세 정보
            </p>
          </div>
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
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>가맹점명</label>
                {editing ? (
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }} />
                ) : (
                  <p className="text-white font-medium">{merchant.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>사업자등록번호</label>
                {editing ? (
                  <input value={form.biz_no} onChange={e => setForm(p => ({ ...p, biz_no: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }} />
                ) : (
                  <p className="text-white font-medium">{merchant.biz_no}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>주소</label>
                {editing ? (
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }} />
                ) : (
                  <p className="text-white font-medium">{merchant.address || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--bp-text-3)' }}>등록일</label>
                <p className="text-white font-medium">{new Date(merchant.created_at).toLocaleDateString('ko-KR')}</p>
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
                <p className="text-white whitespace-pre-wrap">{merchant.description || '-'}</p>
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

          {/* 가맹점 키 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">가맹점 키 ({keys.length}개)</h2>
              {canEdit && (
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bp-primary)' }}
                >
                  <Plus className="w-4 h-4" />
                  키 추가
                </button>
              )}
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
            >
              {keys.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--bp-text-3)' }}>
                  등록된 가맹점 키가 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {keys.map(k => (
                    <div
                      key={k.id}
                      onClick={() => router.push(`/store/admin/keys/${k.id}`)}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: 'var(--bp-bg)' }}
                    >
                      <Key className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--bp-text-3)' }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">{k.name}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              background: k.env === 'production' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)',
                              color: k.env === 'production' ? 'var(--bp-primary)' : '#FBBF24',
                            }}
                          >
                            {k.env === 'production' ? '운영' : '개발'}
                          </span>
                          {!k.is_active && (
                            <span className="text-xs" style={{ color: 'var(--bp-text-3)' }}>비활성</span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
                          {k.store_name ? `매장: ${k.store_name} · ` : '가맹점 공통 · '}
                          MID: {k.mid} · enc: {k.enc_key} · ak: {k.online_ak}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 매장 목록 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">매장 목록 ({stores.length}개)</h2>
              {canEdit && (
                <button
                  onClick={() => setShowAddStoreModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bp-primary)' }}
                >
                  <Plus className="w-4 h-4" />
                  매장 추가
                </button>
              )}
            </div>

            {stores.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {stores.map(store => (
                  <div
                    key={store.id}
                    className="rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: 'var(--bp-surface)',
                      border: '1px solid var(--bp-border)',
                    }}
                    onClick={() => router.push(`/store/admin/stores/${store.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-white">{store.store_name}</span>
                        <span className="text-xs ml-2" style={{ color: 'var(--bp-text-3)' }}>
                          {store.address || '주소 없음'} · {new Date(store.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ml-2 ${
                          store.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {store.is_active ? '운영중' : '비운영'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-xl p-8 text-center"
                style={{
                  background: 'var(--bp-surface)',
                  border: '1px solid var(--bp-border)',
                  color: 'var(--bp-text-3)',
                }}
              >
                등록된 매장이 없습니다.
              </div>
            )}
          </div>

          {/* 전체 단말기 섹션 */}
          {terminals.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">전체 단말기 ({terminals.length}개)</h2>
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
                      <th className="text-left px-4 py-3 font-medium">매장명</th>
                      <th className="text-left px-4 py-3 font-medium">단말기명</th>
                      <th className="text-left px-4 py-3 font-medium">단말기ID</th>
                      <th className="text-left px-4 py-3 font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminals.map(terminal => (
                      <tr
                        key={terminal.id}
                        style={{ borderBottom: '1px solid var(--bp-border)' }}
                      >
                        <td className="px-4 py-3 text-white font-medium">{terminal.store_name}</td>
                        <td className="px-4 py-3 text-white">{terminal.name}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 권한관리 탭 */}
      {activeTab === 'permission' && (
        <>
          {canEdit && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">관리자/매니저 관리</h2>
              <div
                className="rounded-xl p-6"
                style={{
                  background: 'var(--bp-surface)',
                  border: '1px solid var(--bp-border)',
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* 현재 관리자 */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: 'var(--bp-text-3)' }}
                    >
                      현재 관리자
                    </label>
                    <p className="text-white font-medium">{adminEmail}</p>
                  </div>

                  {/* 현재 매니저 */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: 'var(--bp-text-3)' }}
                    >
                      현재 매니저
                    </label>
                    <p className="text-white font-medium">{managerEmail}</p>
                  </div>
                </div>

                {/* 멤버 목록 */}
                {members.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3">전체 멤버</h3>
                    <div className="space-y-2">
                      {members.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded"
                          style={{ background: 'var(--bp-bg)' }}
                        >
                          <div>
                            <p className="text-white text-sm">{member.email}</p>
                            <p className="text-xs" style={{ color: 'var(--bp-text-3)' }}>
                              {member.role === 'merchant_admin' ? '관리자' : '매니저'}
                            </p>
                          </div>
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm('이 멤버를 삭제하시겠습니까?')) {
                                  handleDeleteMember(member.id)
                                }
                              }}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 신규 멤버 추가 버튼 */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bp-primary)', border: '1px solid var(--bp-border)' }}
                >
                  <Plus className="w-4 h-4" />
                  멤버 추가
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 멤버 추가 모달 (탭 밖 — 항상 렌더링 가능) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
          >
            <h3 className="text-lg font-bold text-white mb-4">멤버 추가</h3>

            {/* 탭 */}
            <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: 'var(--bp-bg)' }}>
              <button
                onClick={() => setAddTab('existing')}
                className="flex-1 py-1.5 rounded text-sm font-medium transition-all"
                style={{
                  background: addTab === 'existing' ? 'var(--bp-surface)' : 'transparent',
                  color: addTab === 'existing' ? 'white' : 'var(--bp-text-3)',
                }}
              >
                기존 사용자 선택
              </button>
              <button
                onClick={() => setAddTab('new')}
                className="flex-1 py-1.5 rounded text-sm font-medium transition-all"
                style={{
                  background: addTab === 'new' ? 'var(--bp-surface)' : 'transparent',
                  color: addTab === 'new' ? 'white' : 'var(--bp-text-3)',
                }}
              >
                신규 생성
              </button>
            </div>

            {/* 기존 사용자 선택 탭 */}
            {addTab === 'existing' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">사용자 선택</label>
                  <select
                    value={existingForm.user_id}
                    onChange={(e) => setExistingForm({ ...existingForm, user_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)', color: 'white' }}
                  >
                    <option value="">-- 사용자를 선택하세요 --</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--bp-text-3)' }}>
                      추가 가능한 사용자가 없습니다.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">역할</label>
                  <select
                    value={existingForm.role}
                    onChange={(e) => setExistingForm({ ...existingForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)', color: 'white' }}
                  >
                    <option value="merchant_admin">관리자</option>
                    <option value="merchant_manager">매니저</option>
                  </select>
                </div>
              </div>
            )}

            {/* 신규 생성 탭 */}
            {addTab === 'new' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">ID (이메일)</label>
                  <input
                    type="email"
                    placeholder="member@example.com"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)', color: 'white' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">비밀번호</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)', color: 'white' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">역할</label>
                  <select
                    value={addFormData.role}
                    onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)', color: 'white' }}
                  >
                    <option value="merchant_admin">관리자</option>
                    <option value="merchant_manager">매니저</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setAddTab('existing')
                  setExistingForm({ user_id: '', role: 'merchant_admin' })
                  setAddFormData({ email: '', password: '', role: 'merchant_admin' })
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'white' }}
              >
                취소
              </button>
              <button
                onClick={addTab === 'existing' ? handleMapExistingUser : handleAddMember}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--bp-primary)' }}
              >
                {isLoading ? '처리 중...' : addTab === 'existing' ? '설정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 키 추가 모달 (탭 밖 — 항상 렌더링 가능) */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <h3 className="text-lg font-bold text-white mb-4">가맹점 키 추가</h3>
            <div className="space-y-3">
              {([
                { field: 'name', label: '키 이름', placeholder: '운영키', required: true },
                { field: 'mid', label: 'MID', placeholder: 'M00000000', required: true },
                { field: 'enc_key', label: '암호화키 (enc_key)', placeholder: '', required: true },
                { field: 'online_ak', label: '인증키 (online_ak)', placeholder: '', required: true },
                { field: 'description', label: '설명', placeholder: '선택 입력', required: false },
              ] as { field: keyof KeyForm; label: string; placeholder: string; required: boolean }[]).map(({ field, label, placeholder, required }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-white mb-1">
                    {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input
                    type="text"
                    value={keyForm[field]}
                    onChange={e => setKeyForm(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-white mb-1">환경</label>
                <div className="flex gap-2">
                  {(['production', 'development'] as const).map(env => (
                    <button
                      key={env}
                      onClick={() => setKeyForm(p => ({ ...p, env }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: keyForm.env === env
                          ? (env === 'production' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)')
                          : 'var(--bp-bg)',
                        border: `1px solid ${keyForm.env === env ? (env === 'production' ? 'var(--bp-primary)' : '#FBBF24') : 'var(--bp-border)'}`,
                        color: keyForm.env === env ? (env === 'production' ? 'var(--bp-primary)' : '#FBBF24') : 'var(--bp-text-3)',
                      }}
                    >
                      {env === 'production' ? '운영' : '개발'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setShowKeyModal(false); setKeyForm(EMPTY_KEY) }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'white' }}
              >
                취소
              </button>
              <button
                onClick={handleAddKey}
                disabled={isKeyLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--bp-primary)' }}
              >
                {isKeyLoading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 매장 추가 모달 (탭 밖 — 항상 렌더링 가능) */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
          >
            <h3 className="text-lg font-bold text-white mb-4">새 매장 추가</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white mb-1">매장명 *</label>
                <input
                  type="text"
                  placeholder="매장명을 입력하세요"
                  value={storeForm.store_name}
                  onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--bp-surface-2)',
                    border: '1px solid var(--bp-border)',
                    color: 'white',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white mb-1">주소</label>
                <input
                  type="text"
                  placeholder="매장 주소를 입력하세요"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
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
                onClick={() => { setShowAddStoreModal(false); setStoreForm({ store_name: '', address: '' }) }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'white' }}
              >
                취소
              </button>
              <button
                onClick={handleAddStore}
                disabled={isStoreLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--bp-primary)' }}
              >
                {isStoreLoading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <a
          href="/store/admin/merchants"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{
            background: 'var(--bp-surface)',
            border: '1px solid var(--bp-border)',
            color: 'var(--bp-text-3)',
          }}
        >
          돌아가기
        </a>
      </div>
    </div>
  )
}
