'use client'

type FormData = {
  name: string
  biz_no: string
  address: string
  description: string | null
}

interface MerchantFormProps {
  form: FormData
  setForm: (form: FormData | ((prev: FormData) => FormData)) => void
  error: string
}

export default function MerchantForm({
  form,
  setForm,
  error,
}: MerchantFormProps) {
  const handleChange = (key: keyof FormData, value: string | null) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }
  return (
    <div className="space-y-4">
      <div>
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--bp-text-3)' }}
        >
          가맹점명
          <span className="text-red-400 ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => handleChange('name', e.target.value)}
          placeholder="가맹점명"
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{
            background: 'var(--bp-surface-2)',
            border: '1px solid var(--bp-border)',
          }}
        />
      </div>

      <div>
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--bp-text-3)' }}
        >
          사업자등록번호
          <span className="text-red-400 ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={form.biz_no}
          onChange={e =>
            handleChange('biz_no', e.target.value)
          }
          placeholder="123-45-67890"
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{
            background: 'var(--bp-surface-2)',
            border: '1px solid var(--bp-border)',
          }}
        />
      </div>

      <div>
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--bp-text-3)' }}
        >
          주소
          <span className="text-red-400 ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={form.address}
          onChange={e => handleChange('address', e.target.value)}
          placeholder="주소"
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{
            background: 'var(--bp-surface-2)',
            border: '1px solid var(--bp-border)',
          }}
        />
      </div>

      <div>
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--bp-text-3)' }}
        >
          설명
        </label>
        <textarea
          value={form.description || ''}
          onChange={e => handleChange('description', e.target.value || null)}
          placeholder="설명 (선택)"
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
          rows={3}
          style={{
            background: 'var(--bp-surface-2)',
            border: '1px solid var(--bp-border)',
          }}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
