'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import type { Store } from './page'
import { ROLES } from '@/lib/roles/permissions'

interface Terminal {
  id: string
  store_id: string
  term_id: string
  name: string
  status: 'online' | 'offline'
}

type StoreForm = { store_name: string; address: string }

const EMPTY_STORE: StoreForm = { store_name: '', address: '' }

export default function StoresClient({
  stores: initialStores,
  myRole,
  merchantId,
  merchantName,
  terminals = [],
}: {
  stores: Store[]
  myRole: string
  merchantId: string
  merchantName?: string
  terminals?: Terminal[]
}) {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>(initialStores)

  const terminalsByStore = useMemo(() => {
    const map = new Map<string, Terminal[]>()
    for (const terminal of terminals) {
      if (!map.has(terminal.store_id)) map.set(terminal.store_id, [])
      map.get(terminal.store_id)!.push(terminal)
    }
    return map
  }, [terminals])

  const canAddStore = [ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN].includes(myRole as any)
  const canEditStore = [ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN, ROLES.STORE_ADMIN].includes(myRole as any)
  const canDeleteStore = [ROLES.PLATFORM_ADMIN, ROLES.MERCHANT_ADMIN].includes(myRole as any)

  const [storeModal, setStoreModal] = useState<{ mode: 'add' | 'edit'; target?: Store } | null>(null)
  const [storeForm, setStoreForm] = useState<StoreForm>(EMPTY_STORE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openAddStore() {
    setStoreForm(EMPTY_STORE)
    setError('')
    setStoreModal({ mode: 'add' })
  }

  function openEditStore(e: React.MouseEvent, s: Store) {
    e.stopPropagation()
    setStoreForm({ store_name: s.store_name, address: s.address ?? '' })
    setError('')
    setStoreModal({ mode: 'edit', target: s })
  }

  async function saveStore() {
    if (!storeForm.store_name.trim()) { setError('매장명을 입력하세요.'); return }
    if (!confirm('저장하시겠습니까?')) return
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
        setStores(prev => [...prev, json.data as Store])
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

  async function deleteStore(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">매장 관리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            {merchantName ? `${merchantName} · ` : ''}{stores.length}개 매장
          </p>
        </div>
        {canAddStore && (
          <button
            onClick={openAddStore}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}
          >
            <Plus className="w-4 h-4" />
            매장 추가
          </button>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bp-border)', color: 'var(--bp-text-3)' }}>
              <th className="text-left px-4 py-3 font-medium">매장명</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">주소</th>
              <th className="text-left px-4 py-3 font-medium">단말기</th>
              <th className="text-left px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {stores.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12" style={{ color: 'var(--bp-text-3)' }}>
                  등록된 매장이 없습니다.
                </td>
              </tr>
            ) : (
              stores.map(store => {
                const storeTerminals = terminalsByStore.get(store.id) ?? []
                const onlineCount = storeTerminals.filter(t => t.status === 'online').length
                return (
                  <tr
                    key={store.id}
                    onClick={() => router.push(`/store/admin/stores/${store.id}`)}
                    className="cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ borderBottom: '1px solid var(--bp-border)' }}
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {store.store_name}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--bp-text-3)' }}>
                      {store.address || '-'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--bp-text-3)' }}>
                      {storeTerminals.length > 0
                        ? `${onlineCount}/${storeTerminals.length}개`
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        store.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {store.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        {canEditStore && (
                          <button
                            onClick={e => openEditStore(e, store)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                            style={{ color: 'var(--bp-text-3)' }}
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDeleteStore && (
                          <button
                            onClick={e => deleteStore(e, store.id, store.store_name)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 hover:text-red-400"
                            style={{ color: 'var(--bp-text-3)' }}
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
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
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>주소</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={e => setStoreForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="서울시 강남구..."
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
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}
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
