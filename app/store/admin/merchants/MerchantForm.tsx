'use client'

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

interface MerchantFormProps {
  form: FormData
  setForm: (form: FormData | ((prev: FormData) => FormData)) => void
  admins: Admin[]
  managers: Manager[]
  error: string
}

export default function MerchantForm({
  form,
  setForm,
  admins,
  managers,
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
          관리자
        </label>
        <select
          value={form.admin_id}
          onChange={e => handleChange('admin_id', e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{
            background: 'var(--bp-surface-2)',
            border: '1px solid var(--bp-border)',
          }}
        >
          <option value="" style={{ background: '#1e2533' }}>
            관리자를 선택하세요 (선택)
          </option>
          {admins.map(admin => (
            <option key={admin.id} value={admin.id} style={{ background: '#1e2533' }}>
              {admin.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--bp-text-3)' }}
        >
          매니저
        </label>
        <select
          value={form.manager_id || ''}
          onChange={e =>
            handleChange('manager_id', e.target.value || null)
          }
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{
            background: 'var(--bp-surface-2)',
            border: '1px solid var(--bp-border)',
          }}
        >
          <option value="" style={{ background: '#1e2533' }}>
            매니저를 선택하세요 (선택)
          </option>
          {managers.map(manager => (
            <option
              key={manager.id}
              value={manager.id}
              style={{ background: '#1e2533' }}
            >
              {manager.email}
            </option>
          ))}
        </select>
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
