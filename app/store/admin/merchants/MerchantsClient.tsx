'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import type { Merchant } from '@/lib/context/MerchantStoreContext'
import { ROLES } from '@/lib/roles/permissions'
import MerchantForm from './MerchantForm'

interface Admin {
  id: string
  email: string
}

interface Manager {
  id: string
  email: string
}

type FormData = {
  name: string
  biz_no: string
  address: string
  admin_id: string
  manager_id: string | null
  description: string | null
}

const EMPTY_FORM: FormData = {
  name: '',
  biz_no: '',
  address: '',
  admin_id: '',
  manager_id: null,
  description: null,
}

export default function MerchantsClient({
  merchants: initialMerchants,
  admins,
  managers,
  userRole,
  userMerchantId,
}: {
  merchants: Merchant[]
  admins: Admin[]
  managers: Manager[]
  userRole: string | null
  userMerchantId: string | null
}) {
  const router = useRouter()
  const [merchants, setMerchants] = useState<Merchant[]>(initialMerchants)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 역할을 소문자로 정규화
  const normalizedRole = userRole?.toLowerCase()

  // 권한 체크
  const isPlatform =
    normalizedRole === ROLES.PLATFORM_ADMIN || normalizedRole === ROLES.PLATFORM_MANAGER
  const isMerchantAdmin = normalizedRole === ROLES.MERCHANT_ADMIN
  const canAccess = isPlatform || isMerchantAdmin
  const canCreate = isPlatform
  const canEdit = isPlatform || isMerchantAdmin
  const canDelete = isPlatform

  // 필터링: 권한에 따른 가맹점 목록
  const filteredMerchants = isPlatform
    ? merchants
    : isMerchantAdmin && userMerchantId
      ? merchants.filter(m => m.id === userMerchantId)
      : []

  function openAddModal() {
    setForm(EMPTY_FORM)
    setError('')
    setModalMode('add')
    setEditingMerchant(null)
    setShowModal(true)
  }

  function openEditModal(merchant: Merchant) {
    setForm({
      name: merchant.name,
      biz_no: merchant.biz_no,
      address: merchant.address,
      admin_id: merchant.admin_id || '',
      manager_id: merchant.manager_id || null,
      description: merchant.description,
    })
    setError('')
    setModalMode('edit')
    setEditingMerchant(merchant)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('가맹점명을 입력하세요.')
      return
    }
    if (!form.biz_no.trim()) {
      setError('사업자등록번호를 입력하세요.')
      return
    }
    if (!form.address.trim()) {
      setError('주소를 입력하세요.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = '/api/merchant/merchants'
      const method = modalMode === 'add' ? 'POST' : 'PATCH'
      const body =
        modalMode === 'add'
          ? form
          : {
              id: editingMerchant!.id,
              ...form,
            }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '저장 실패')

      if (modalMode === 'add') {
        setMerchants(prev => [...prev, json.data])
      } else {
        setMerchants(prev =>
          prev.map(m => (m.id === editingMerchant!.id ? json.data : m))
        )
      }

      setShowModal(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}' 가맹점을 삭제하시겠습니까?`)) return

    try {
      const res = await fetch('/api/merchant/merchants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '삭제 실패')

      setMerchants(prev => prev.filter(m => m.id !== id))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  if (!canAccess) {
    return (
      <div
        className="p-12 rounded-xl text-center"
        style={{
          background: 'var(--bp-surface)',
          border: '1px solid var(--bp-border)',
          color: 'var(--bp-text-3)',
        }}
      >
        가맹점 관리 권한이 없습니다.
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">가맹점 관리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            가맹점 정보를 관리합니다 ({filteredMerchants.length}개 가맹점)
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80"
            style={{ background: '#06D6A0' }}
          >
            <Plus className="w-4 h-4" />
            가맹점 추가
          </button>
        )}
      </div>

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
              <th className="text-left px-4 py-3 font-medium">가맹점명</th>
              <th className="text-left px-4 py-3 font-medium">사업자번호</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                주소
              </th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                관리자
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredMerchants.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12"
                  style={{ color: 'var(--bp-text-3)' }}
                >
                  등록된 가맹점이 없습니다.
                </td>
              </tr>
            ) : (
              filteredMerchants.map(merchant => {
                const adminName =
                  admins.find(a => a.id === merchant.admin_id)?.email || '미지정'
                return (
                  <tr
                    key={merchant.id}
                    style={{ borderBottom: '1px solid var(--bp-border)' }}
                  >
                    <td
                      className="px-4 py-3 text-white font-medium cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => router.push(`/store/admin/merchants/${merchant.id}`)}
                    >
                      {merchant.name}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: 'var(--bp-text-3)' }}
                    >
                      {merchant.biz_no}
                    </td>
                    <td
                      className="px-4 py-3 text-sm hidden md:table-cell"
                      style={{ color: 'var(--bp-text-3)' }}
                    >
                      {merchant.address}
                    </td>
                    <td
                      className="px-4 py-3 text-sm hidden lg:table-cell"
                      style={{ color: 'var(--bp-text-3)' }}
                    >
                      {adminName}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 생성/수정 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: 'var(--bp-surface)',
              border: '1px solid var(--bp-border)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">
                {modalMode === 'add' ? '가맹점 추가' : '가맹점 수정'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-white/10"
                style={{ color: 'var(--bp-text-3)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <MerchantForm
              form={form}
              setForm={setForm}
              admins={admins}
              managers={managers}
              error={error}
            />

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
                style={{
                  color: 'var(--bp-text-3)',
                  border: '1px solid var(--bp-border)',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
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
