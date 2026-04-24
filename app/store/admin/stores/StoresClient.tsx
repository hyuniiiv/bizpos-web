'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Key, Store as StoreIcon } from 'lucide-react'
import type { Store, StoreKey } from './page'
import { ROLES } from '@/lib/roles/permissions'

type StoreForm = { store_name: string; biz_no: string }
type KeyForm = { name: string; mid: string; enc_key: string; online_ak: string; description: string; env: 'production' | 'development' }

const EMPTY_STORE: StoreForm = { store_name: '', biz_no: '' }
const EMPTY_KEY: KeyForm = { name: '', mid: '', enc_key: '', online_ak: '', description: '', env: 'production' }

function EnvBadge({ env }: { env: 'production' | 'development' }) {
  const isProd = env === 'production'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{
        background: isProd ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)',
        color: isProd ? '#06D6A0' : '#FBBF24',
        border: `1px solid ${isProd ? 'rgba(6,214,160,0.3)' : 'rgba(251,191,36,0.3)'}`,
      }}
    >
      {isProd ? '운영' : '개발'}
    </span>
  )
}

function KeyRow({
  k,
  onDelete,
}: {
  k: StoreKey
  onDelete: (id: string, name: string) => void
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 rounded-lg"
      style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Key className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--bp-text-3)' }} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white truncate">{k.name}</span>
            <EnvBadge env={k.env} />
            {!k.is_active && (
              <span className="text-xs" style={{ color: 'var(--bp-text-3)' }}>비활성</span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            MID: {k.mid} · enc: {k.enc_key} · ak: {k.online_ak}
          </p>
        </div>
      </div>
      <button
        onClick={() => onDelete(k.id, k.name)}
        className="p-1.5 rounded-lg flex-shrink-0 ml-2 transition-colors hover:bg-red-500/20 hover:text-red-400"
        style={{ color: 'var(--bp-text-3)' }}
        title="키 삭제"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function StoreCard({
  store,
  onEdit,
  onDelete,
  onAddKey,
  onDeleteKey,
}: {
  store: Store
  onEdit: (s: Store) => void
  onDelete: (id: string, name: string) => void
  onAddKey: (store: Store) => void
  onDeleteKey: (keyId: string, keyName: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const prodCount = store.merchant_keys.filter(k => k.env === 'production').length
  const devCount = store.merchant_keys.filter(k => k.env === 'development').length

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: expanded ? '1px solid var(--bp-border)' : 'none' }}
        onClick={() => setExpanded(v => !v)}
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--bp-text-3)' }} />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--bp-text-3)' }} />
        }
        <StoreIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#06D6A0' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{store.store_name}</span>
            {!store.is_active && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                비활성
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            {store.biz_no ? `사업자 ${store.biz_no} · ` : ''}
            키 {store.merchant_keys.length}개
            {prodCount > 0 && ` (운영 ${prodCount})`}
            {devCount > 0 && ` (개발 ${devCount})`}
          </p>
        </div>
        <div
          className="flex items-center gap-1 ml-2"
          onClick={e => e.stopPropagation()}
        >
          {canEditStore && (
            <button
              onClick={() => onEdit(store)}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--bp-text-3)' }}
              title="매장 수정"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDeleteStore && (
            <button
              onClick={() => onDelete(store.id, store.store_name)}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 hover:text-red-400"
              style={{ color: 'var(--bp-text-3)' }}
              title="매장 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-2">
          {store.merchant_keys.length === 0 ? (
            <p className="text-xs py-2 text-center" style={{ color: 'var(--bp-text-3)' }}>
              등록된 가맹점 키가 없습니다.
            </p>
          ) : (
            store.merchant_keys.map(k => (
              <KeyRow key={k.id} k={k} onDelete={canDeleteKey ? onDeleteKey : () => {}} />
            ))
          )}
          {canAddKey && (
            <button
              onClick={() => onAddKey(store)}
              className="w-full flex items-center justify-center gap-2 py-2 mt-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: 'var(--bp-text-3)', border: '1px dashed var(--bp-border)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              키 추가
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function StoresClient({
  stores: initialStores,
  myRole,
  merchantId,
}: {
  stores: Store[]
  myRole: string
  merchantId: string
}) {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>(initialStores)
  
  // 권한 제어 로직 (간소화)
  const canAddStore = [ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN].includes(myRole as any)
  const canEditStore = [ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN, ROLES.STORE_ADMIN].includes(myRole as any)
  const canDeleteStore = [ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN].includes(myRole as any)
  const canAddKey = [ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN, ROLES.TERMINAL_ADMIN].includes(myRole as any)
  const canDeleteKey = [ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN, ROLES.TERMINAL_ADMIN].includes(myRole as any)

  const [storeModal, setStoreModal] = useState<{ mode: 'add' | 'edit'; target?: Store } | null>(null)
  const [storeForm, setStoreForm] = useState<StoreForm>(EMPTY_STORE)
  const [keyModal, setKeyModal] = useState<{ store: Store } | null>(null)
  const [keyForm, setKeyForm] = useState<KeyForm>(EMPTY_KEY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openAddStore() {
    setStoreForm(EMPTY_STORE)
    setError('')
    setStoreModal({ mode: 'add' })
  }

  function openEditStore(s: Store) {
    setStoreForm({ store_name: s.store_name, biz_no: s.biz_no ?? '' })
    setError('')
    setStoreModal({ mode: 'edit', target: s })
  }

  function openAddKey(store: Store) {
    setKeyForm(EMPTY_KEY)
    setError('')
    setKeyModal({ store })
  }

  async function saveStore() {
    if (!storeForm.store_name.trim()) { setError('매장명을 입력하세요.'); return }
    setSaving(true)
    setError('')
    try {
      if (storeModal?.mode === 'add') {
        const res = await fetch('/api/merchant/store-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...storeForm, merchant_id: merchantId }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '저장 실패')
        const newStore: Store = { ...json.data, merchant_keys: [] }
        setStores(prev => [...prev, newStore])
      } else if (storeModal?.target) {
        const res = await fetch('/api/merchant/store-locations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: storeModal.target.id, ...storeForm }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '저장 실패')
        setStores(prev =>
          prev.map(s => s.id === storeModal.target!.id ? { ...s, ...json.data } : s)
        )
      }
      setStoreModal(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  async function deleteStore(id: string, name: string) {
    if (!confirm(`'${name}' 매장을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch('/api/merchant/store-locations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error ?? '삭제 실패')
        return
      }
      setStores(prev => prev.filter(s => s.id !== id))
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  async function saveKey() {
    const { name, mid, enc_key, online_ak } = keyForm
    if (!name || !mid || !enc_key || !online_ak) {
      setError('이름, MID, 암호화키, 인증키는 필수입니다.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/merchant/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...keyForm, store_id: keyModal!.store.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '저장 실패')
      const newKey: StoreKey = json
      setStores(prev =>
        prev.map(s =>
          s.id === keyModal!.store.id
            ? { ...s, merchant_keys: [...s.merchant_keys, newKey] }
            : s
        )
      )
      setKeyModal(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  async function deleteKey(keyId: string, keyName: string) {
    if (!confirm(`'${keyName}' 키를 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/merchant/keys/${keyId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error ?? '삭제 실패')
        return
      }
      setStores(prev =>
        prev.map(s => ({ ...s, merchant_keys: s.merchant_keys.filter(k => k.id !== keyId) }))
      )
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
            매장별 가맹점 키를 등록·관리합니다 ({stores.length}개 매장)
          </p>
        </div>
        <button
          onClick={openAddStore}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80"
          style={{ background: '#06D6A0', display: canAddStore ? 'flex' : 'none' }}
        >
          <Plus className="w-4 h-4" />
          매장 추가
        </button>
      </div>

      <div className="space-y-3">
        {stores.length === 0 ? (
          <div
            className="p-12 rounded-xl text-center"
            style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', color: 'var(--bp-text-3)' }}
          >
            등록된 매장이 없습니다. 매장을 추가해 주세요.
          </div>
        ) : stores.map(s => (
          <StoreCard
            key={s.id}
            store={s}
            onEdit={openEditStore}
            onDelete={deleteStore}
            onAddKey={openAddKey}
            onDeleteKey={deleteKey}
          />
        ))}
      </div>

      {/* 매장 추가/수정 모달 */}
      {storeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">
                {storeModal.mode === 'add' ? '매장 추가' : '매장 수정'}
              </h2>
              <button onClick={() => setStoreModal(null)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--bp-text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                  매장명 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={storeForm.store_name}
                  onChange={e => setStoreForm(p => ({ ...p, store_name: e.target.value }))}
                  placeholder="강남점"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>사업자번호</label>
                <input
                  type="text"
                  value={storeForm.biz_no}
                  onChange={e => setStoreForm(p => ({ ...p, biz_no: e.target.value }))}
                  placeholder="000-00-00000"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                />
              </div>
            </div>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setStoreModal(null)}
                className="flex-1 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
                style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
              >
                취소
              </button>
              <button
                onClick={saveStore}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: '#06D6A0' }}
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 키 추가 모달 */}
      {keyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-white">가맹점 키 추가</h2>
              <button onClick={() => setKeyModal(null)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--bp-text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs mb-5" style={{ color: 'var(--bp-text-3)' }}>{keyModal.store.store_name}</p>
            <div className="space-y-3">
              {(
                [
                  { key: 'name', label: '키 이름', placeholder: '운영키', required: true },
                  { key: 'mid', label: 'MID', placeholder: 'M00000000', required: true },
                  { key: 'enc_key', label: '암호화키 (enc_key)', placeholder: '', required: true },
                  { key: 'online_ak', label: '인증키 (online_ak)', placeholder: '', required: true },
                  { key: 'description', label: '설명', placeholder: '선택 입력', required: false },
                ] as { key: keyof KeyForm; label: string; placeholder: string; required: boolean }[]
              ).map(({ key, label, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--bp-text-3)' }}>
                    {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input
                    type="text"
                    value={keyForm[key]}
                    onChange={e => setKeyForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--bp-text-3)' }}>환경</label>
                <div className="flex gap-2">
                  {(['production', 'development'] as const).map(env => (
                    <button
                      key={env}
                      onClick={() => setKeyForm(p => ({ ...p, env }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: keyForm.env === env
                          ? (env === 'production' ? 'rgba(6,214,160,0.15)' : 'rgba(251,191,36,0.15)')
                          : 'var(--bp-surface-2)',
                        border: keyForm.env === env
                          ? `1px solid ${env === 'production' ? '#06D6A0' : '#FBBF24'}`
                          : '1px solid var(--bp-border)',
                        color: keyForm.env === env
                          ? (env === 'production' ? '#06D6A0' : '#FBBF24')
                          : 'var(--bp-text-3)',
                      }}
                    >
                      {env === 'production' ? '운영' : '개발'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setKeyModal(null)}
                className="flex-1 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
                style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
              >
                취소
              </button>
              <button
                onClick={saveKey}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: '#06D6A0' }}
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
