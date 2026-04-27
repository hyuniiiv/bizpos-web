'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Key } from 'lucide-react'
import { toast } from 'sonner'

interface KeyData {
  id: string
  name: string
  mid: string
  enc_key: string
  online_ak: string
  description: string | null
  is_active: boolean
  env: 'production' | 'development'
  store_id: string | null
  merchant_id: string
  created_at: string
  store_name: string | null
  merchant_name: string | null
}

interface Props {
  keyData: KeyData
  canEdit: boolean
  canDelete: boolean
}

type EditForm = {
  name: string
  description: string
  is_active: boolean
  env: 'production' | 'development'
}

export default function KeyDetailClient({ keyData, canEdit, canDelete }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm>({
    name: keyData.name,
    description: keyData.description ?? '',
    is_active: keyData.is_active,
    env: keyData.env,
  })

  async function handleSave() {
    if (!confirm('저장하시겠습니까?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/merchant/keys/${keyData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error?.message ?? '수정 실패')
      }
      toast.success('키 정보가 수정되었습니다.')
      setEditing(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '수정 실패')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`'${keyData.name}' 키를 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/merchant/keys/${keyData.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error?.message ?? '삭제 실패')
      }
      toast.success('키가 삭제되었습니다.')
      router.push('/store/admin/keys')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  function cancelEdit() {
    setEditing(false)
    setForm({
      name: keyData.name,
      description: keyData.description ?? '',
      is_active: keyData.is_active,
      env: keyData.env,
    })
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--bp-text-3)' }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5" style={{ color: 'var(--bp-primary)' }} />
              {keyData.name}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--bp-text-3)' }}>키 상세 정보</p>
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

      {/* 상세 카드 */}
      <div className="rounded-xl p-6 space-y-5" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 키 이름 */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>키 이름</label>
            {editing ? (
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
              />
            ) : (
              <p className="text-white font-medium">{keyData.name}</p>
            )}
          </div>

          {/* 환경 */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>환경</label>
            {editing ? (
              <div className="flex gap-2">
                {(['production', 'development'] as const).map(env => (
                  <button
                    key={env}
                    onClick={() => setForm(p => ({ ...p, env }))}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: form.env === env
                        ? (env === 'production' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)')
                        : 'var(--bp-surface-2)',
                      border: `1px solid ${form.env === env ? (env === 'production' ? '#06D6A0' : '#FBBF24') : 'var(--bp-border)'}`,
                      color: form.env === env ? (env === 'production' ? '#06D6A0' : '#FBBF24') : 'var(--bp-text-3)',
                    }}
                  >
                    {env === 'production' ? '운영' : '개발'}
                  </button>
                ))}
              </div>
            ) : (
              <span
                className="text-xs px-2 py-1 rounded font-semibold"
                style={{
                  background: keyData.env === 'production' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)',
                  color: keyData.env === 'production' ? '#06D6A0' : '#FBBF24',
                }}
              >
                {keyData.env === 'production' ? '운영' : '개발'}
              </span>
            )}
          </div>

          {/* 상태 */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>상태</label>
            {editing ? (
              <button
                onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  form.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {form.is_active ? '활성' : '비활성'} (클릭하여 변경)
              </button>
            ) : (
              <span className={`text-xs px-2 py-1 rounded font-semibold ${
                keyData.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {keyData.is_active ? '활성' : '비활성'}
              </span>
            )}
          </div>

          {/* 가맹점 */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>가맹점</label>
            <p className="text-white font-medium">{keyData.merchant_name ?? '-'}</p>
          </div>

          {/* 연결 매장 */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>연결 매장</label>
            <p className="text-white font-medium">{keyData.store_name ?? '가맹점 공통'}</p>
          </div>

          {/* 등록일 */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>등록일</label>
            <p className="text-white font-medium">{new Date(keyData.created_at).toLocaleDateString('ko-KR')}</p>
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>설명</label>
          {editing ? (
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="선택 입력"
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
            />
          ) : (
            <p className="text-white">{keyData.description || '-'}</p>
          )}
        </div>

        {/* 키 값 (마스킹) */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--bp-border)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--bp-text-3)' }}>키 값 (마스킹됨)</p>
          <div className="space-y-2">
            {[
              { label: 'MID', value: keyData.mid },
              { label: '암호화키 (enc_key)', value: keyData.enc_key },
              { label: '인증키 (online_ak)', value: keyData.online_ak },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'var(--bp-surface-2)' }}
              >
                <span className="text-xs w-36 flex-shrink-0" style={{ color: 'var(--bp-text-3)' }}>{label}</span>
                <span className="font-mono text-sm text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 수정 모드 버튼 */}
        {editing && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={cancelEdit}
              className="flex-1 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
              style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--bp-primary)', color: 'var(--bp-primary-fg)' }}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
