'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { MERCHANT_ASSIGNABLE as ASSIGNABLE, NEEDS_PASSWORD_ROLES as NEEDS_PASSWORD } from '@/lib/roles/assignable'

const ROLE_LABEL: Record<string, string> = {
  platform_admin: '시스템 관리자',
  platform_manager: '시스템 운영자',
  merchant_admin: '가맹점 관리자',
  merchant_manager: '가맹점 운영자',
  store_admin: '매장 관리자',
  store_manager: '매장 운영자',
  terminal_admin: '단말기 관리자',
  client_admin: '고객사 관리자',
  client_manager: '고객사 운영자',
}

export interface CreateAccountFormData {
  email?: string
  id?: string
  name: string
  password: string
  passwordConfirm: string
  role: string
  active: boolean
}

interface CreateAccountFormProps {
  myRole: string
  onSubmit: (data: CreateAccountFormData) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  error: string
}

interface FormErrors {
  role?: string
  email?: string
  id?: string
  name?: string
  password?: string
  passwordConfirm?: string
}

export default function CreateAccountForm({
  myRole,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: CreateAccountFormProps) {
  const assignable = ASSIGNABLE[myRole] ?? []

  const [formData, setFormData] = useState<CreateAccountFormData>({
    email: '',
    id: '',
    name: '',
    password: '',
    passwordConfirm: '',
    role: assignable[0] ?? '',
    active: true,
  })

  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const selectedRole = formData.role
  const isPlatformRole = ['platform_admin', 'platform_manager'].includes(selectedRole)
  const needsPassword = NEEDS_PASSWORD.has(selectedRole)

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!selectedRole) {
      errors.role = '역할을 선택하세요.'
    }

    if (!formData.name.trim()) {
      errors.name = '성명을 입력하세요.'
    }

    if (isPlatformRole) {
      if (!formData.email?.trim()) {
        errors.email = '이메일을 입력하세요.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = '유효한 이메일을 입력하세요.'
      }
    } else {
      if (!formData.id?.trim()) {
        errors.id = 'ID를 입력하세요.'
      } else if (formData.id.length < 3) {
        errors.id = 'ID는 3자 이상이어야 합니다.'
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.id)) {
        errors.id = 'ID는 영문, 숫자, 언더스코어만 사용 가능합니다.'
      }
    }

    if (needsPassword) {
      if (!formData.password.trim()) {
        errors.password = '비밀번호를 입력하세요.'
      } else if (formData.password.length < 8) {
        errors.password = '비밀번호는 최소 8자 이상이어야 합니다.'
      }

      if (!formData.passwordConfirm.trim()) {
        errors.passwordConfirm = '비밀번호 확인을 입력하세요.'
      } else if (formData.password !== formData.passwordConfirm) {
        errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
      setFormData({
        email: '',
        id: '',
        name: '',
        password: '',
        passwordConfirm: '',
        role: assignable[0] ?? '',
        active: true,
      })
      setFormErrors({})
    } catch {
      // Error is handled by parent component
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">계정 생성</h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-white/10"
            style={{ color: 'var(--bp-text-3)' }}
            disabled={isLoading}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label htmlFor="role-select" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
              역할<span className="text-red-400 ml-0.5">*</span>
            </label>
            <select
              id="role-select"
              value={formData.role}
              onChange={e => {
                setFormData(prev => ({ ...prev, role: e.target.value, password: '', passwordConfirm: '' }))
                setFormErrors(prev => ({ ...prev, role: undefined }))
              }}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
              disabled={isLoading}
            >
              {assignable.map(r => (
                <option key={r} value={r} style={{ background: '#1e2533' }}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            {formErrors.role && <p className="text-xs text-red-400 mt-1">{formErrors.role}</p>}
          </div>

          {/* Email or ID */}
          {isPlatformRole ? (
            <div>
              <label htmlFor="email-input" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                이메일<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                id="email-input"
                type="email"
                value={formData.email}
                onChange={e => {
                  setFormData(prev => ({ ...prev, email: e.target.value }))
                  setFormErrors(prev => ({ ...prev, email: undefined }))
                }}
                placeholder="user@example.com"
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                disabled={isLoading}
              />
              {formErrors.email && <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>}
              <p className="text-xs mt-1.5" style={{ color: 'var(--bp-text-3)' }}>
                이미 가입된 이메일 계정을 연결합니다.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="id-input" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                ID (로그인용)<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                id="id-input"
                type="text"
                value={formData.id}
                onChange={e => {
                  setFormData(prev => ({ ...prev, id: e.target.value }))
                  setFormErrors(prev => ({ ...prev, id: undefined }))
                }}
                placeholder="user_id"
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                disabled={isLoading}
              />
              {formErrors.id && <p className="text-xs text-red-400 mt-1">{formErrors.id}</p>}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name-input" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
              성명<span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="name-input"
              type="text"
              value={formData.name}
              onChange={e => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setFormErrors(prev => ({ ...prev, name: undefined }))
              }}
              placeholder="홍길동"
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
              disabled={isLoading}
            />
            {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
          </div>

          {/* Password Fields (only for roles that need password) */}
          {needsPassword && (
            <>
              <div>
                <label htmlFor="password-input" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                  비밀번호<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  id="password-input"
                  type="password"
                  value={formData.password}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, password: e.target.value }))
                    setFormErrors(prev => ({ ...prev, password: undefined }))
                  }}
                  placeholder="8자 이상 입력"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                  disabled={isLoading}
                />
                {formErrors.password && <p className="text-xs text-red-400 mt-1">{formErrors.password}</p>}
              </div>

              <div>
                <label htmlFor="password-confirm-input" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--bp-text-3)' }}>
                  비밀번호 확인<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  id="password-confirm-input"
                  type="password"
                  value={formData.passwordConfirm}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, passwordConfirm: e.target.value }))
                    setFormErrors(prev => ({ ...prev, passwordConfirm: undefined }))
                  }}
                  placeholder="비밀번호 확인"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)' }}
                  disabled={isLoading}
                />
                {formErrors.passwordConfirm && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.passwordConfirm}</p>
                )}
              </div>

              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(6,214,160,0.08)', color: '#06D6A0' }}>
                새로 생성되는 ID/PW 기반 계정입니다. 사용자에게 별도 전달하세요.
              </p>
            </>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-2 rounded-lg text-sm hover:bg-white/10 disabled:opacity-50"
              style={{ color: 'var(--bp-text-3)', border: '1px solid var(--bp-border)' }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-black hover:opacity-80 disabled:opacity-50"
              style={{ background: '#06D6A0' }}
            >
              {isLoading ? '생성 중…' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
