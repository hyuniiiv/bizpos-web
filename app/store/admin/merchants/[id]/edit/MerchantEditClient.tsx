'use client'

import { useRouter } from 'next/navigation'
import type { Merchant } from '@/lib/context/MerchantStoreContext'
import MerchantForm from '../../MerchantForm'
import { useState } from 'react'

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

interface MerchantEditClientProps {
  merchant: Merchant
  admins: Admin[]
  managers: Manager[]
}

export default function MerchantEditClient({
  merchant,
  admins,
  managers,
}: MerchantEditClientProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    name: merchant.name,
    biz_no: merchant.biz_no,
    address: merchant.address,
    admin_id: merchant.admin_id || '',
    manager_id: merchant.manager_id || null,
    description: merchant.description,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

    if (!confirm('저장하시겠습니까?')) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/merchant/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: merchant.id,
          ...form,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '저장 실패')

      router.push(`/store/admin/merchants/${merchant.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{merchant.name} 수정</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--bp-text-3)' }}>
          가맹점 정보를 수정합니다
        </p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{
          background: 'var(--bp-surface)',
          border: '1px solid var(--bp-border)',
        }}
      >
        <MerchantForm
          form={form}
          setForm={setForm}
          admins={admins}
          managers={managers}
          error={error}
        />

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => router.back()}
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
  )
}
