'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { canManageTerminalLifecycle } from '@/lib/roles/permissions'
import type { Role } from '@/lib/roles/permissions'

type TerminalType = 'ticket_checker' | 'pos' | 'kiosk' | 'table_order'

const TYPE_LABELS: Record<TerminalType, string> = {
  ticket_checker: '식권체크기',
  pos: 'POS',
  kiosk: 'KIOSK',
  table_order: '테이블 오더',
}

interface TerminalFormProps {
  terminal: {
    id: string
    term_id: string
    name: string | null
    corner: string | null
    terminal_type: TerminalType | null
  }
  userRole: Role | null
  readOnly?: boolean
}

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed'
const labelCls = 'block text-sm font-medium text-white/70 mb-2'

export default function TerminalForm({ terminal, userRole, readOnly = false }: TerminalFormProps) {
  const router = useRouter()
  const [termId, setTermId] = useState(terminal.term_id || '')
  const [name, setName] = useState(terminal.name || '')
  const [corner, setCorner] = useState(terminal.corner || '')
  const [terminalType, setTerminalType] = useState<TerminalType>(terminal.terminal_type || 'pos')

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState('')
  const [success, setSuccess] = useState(false)

  const isEditable = !readOnly && canManageTerminalLifecycle(userRole || '')

  const validateTermId = (value: string): string => {
    if (!value) return '단말기 ID는 필수입니다'
    if (!/^\d{1,2}$/.test(value)) return '숫자만 입력 가능합니다 (1-2자리)'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditable) return

    // Validate
    const termIdError = validateTermId(termId)
    if (termIdError) {
      setErrorField('term_id')
      setError(termIdError)
      return
    }

    setSaving(true)
    setError('')
    setErrorField('')
    setSuccess(false)

    try {
      const res = await fetch(`/api/terminals/${terminal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term_id: termId.padStart(2, '0'),
          name,
          corner,
          terminal_type: terminalType,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || '저장 실패')
        setSaving(false)
        return
      }

      setSuccess(true)
      setSaving(false)
      setTimeout(() => router.refresh(), 500)
    } catch (err) {
      setError('네트워크 오류')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isEditable) return
    if (!confirm('이 단말기를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    setDeleting(true)
    setError('')
    setErrorField('')

    try {
      const res = await fetch(`/api/terminals/${terminal.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || '삭제 실패')
        setDeleting(false)
        return
      }

      router.push('/store/admin/terminals')
    } catch (err) {
      setError('네트워크 오류')
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 glass-card rounded-xl p-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          {readOnly ? '단말기 정보 (읽기 전용)' : '단말기 설정'}
        </h3>

        {/* 단말기 ID */}
        <div className="mb-4">
          <label htmlFor="term_id" className={labelCls}>
            단말기 ID
          </label>
          <input
            id="term_id"
            type="text"
            disabled={readOnly || !isEditable}
            placeholder="예: 01"
            maxLength={2}
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
          {errorField === 'term_id' && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>

        {/* 단말기 이름 */}
        <div className="mb-4">
          <label htmlFor="name" className={labelCls}>
            단말기 이름
          </label>
          <input
            id="name"
            type="text"
            disabled={readOnly || !isEditable}
            placeholder="예: 주방 POS"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* 코너 */}
        <div className="mb-4">
          <label htmlFor="corner" className={labelCls}>
            코너
          </label>
          <input
            id="corner"
            type="text"
            disabled={readOnly || !isEditable}
            placeholder="예: 주방"
            value={corner}
            onChange={(e) => setCorner(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* 단말기 타입 */}
        <div className="mb-4">
          <label htmlFor="terminal_type" className={labelCls}>
            단말기 타입
          </label>
          <select
            id="terminal_type"
            disabled={readOnly || !isEditable}
            value={terminalType}
            onChange={(e) => setTerminalType(e.target.value as TerminalType)}
            className={inputCls}
            style={inputStyle}
          >
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 현재 설정된 타입 미리보기 */}
        {terminalType && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/70">
              현재 타입: <span className="text-white font-medium">{TYPE_LABELS[terminalType]}</span>
            </p>
          </div>
        )}

        {/* 오류 메시지 */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/50">
            <p className="text-green-300 text-sm">저장되었습니다.</p>
          </div>
        )}
      </div>

      {/* 버튼 */}
      {!readOnly && (
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={!isEditable || saving}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isEditable || deleting}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      )}

      {!isEditable && !readOnly && (
        <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
          <p className="text-yellow-300 text-sm">
            이 단말기를 수정할 권한이 없습니다. 권한이 필요한 경우 관리자에게 문의하세요.
          </p>
        </div>
      )}
    </form>
  )
}
