'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useMerchantKeys } from '@/lib/hooks/useMerchantKeys'
import type { MerchantKey, MerchantKeyCreateInput, MerchantKeyUpdateInput, KeyEnv } from '@/types/merchant-key'

type Props = { initialKeys: MerchantKey[] }
type EnvFilter = 'all' | KeyEnv

const emptyForm: MerchantKeyCreateInput = { name: '', mid: '', enc_key: '', online_ak: '', description: '', env: 'production' }
const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none transition-all'

function EnvBadge({ env }: { env: KeyEnv }) {
  return env === 'production' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-300">운영</span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/15 text-orange-300">개발</span>
  )
}

export default function MerchantKeyClient({ initialKeys }: Props) {
  const { keys, loading: saving, createKey, updateKey, deleteKey } = useMerchantKeys(initialKeys)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MerchantKeyCreateInput>(emptyForm)
  const [envFilter, setEnvFilter] = useState<EnvFilter>('all')

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(key: MerchantKey) {
    setEditingId(key.id)
    setForm({ name: key.name, mid: key.mid, enc_key: key.enc_key, online_ak: key.online_ak, description: key.description ?? '', env: key.env })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingId) {
        await updateKey(editingId, form as MerchantKeyUpdateInput)
        toast.success('키 정보가 수정되었습니다')
      } else {
        await createKey(form)
        toast.success('새 키가 등록되었습니다')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다')
    }
  }

  async function handleToggle(key: MerchantKey) {
    try {
      await updateKey(key.id, { is_active: !key.is_active })
    } catch {
      toast.error('상태 변경에 실패했습니다')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 키를 삭제하시겠습니까? 연결된 단말기의 키 설정이 해제됩니다.')) return
    try {
      await deleteKey(id)
      toast.success('키가 삭제되었습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  const filtered = envFilter === 'all' ? keys : keys.filter(k => k.env === envFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">키 관리</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-lg text-sm text-white transition-all"
          style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}
        >
          + 키 등록
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">{editingId ? '키 수정' : '새 키 등록'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-2">환경 *</label>
              <div className="flex gap-4">
                {(['production', 'development'] as const).map(env => (
                  <label key={env} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="env" value={env}
                      checked={form.env === env}
                      onChange={() => setForm(p => ({ ...p, env }))}
                      className="accent-blue-400"
                    />
                    <span className="text-sm text-white/80">{env === 'production' ? '운영' : '개발'}</span>
                    <EnvBadge env={env} />
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">키 이름 *</label>
                <input className={inputCls} style={inputStyle}
                  placeholder="예: 매장 운영키" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">MID (가맹점코드) *</label>
                <input className={`${inputCls} font-mono`} style={inputStyle}
                  placeholder="BP2305000094" value={form.mid}
                  onChange={e => setForm(p => ({ ...p, mid: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">암복호화 KEY *</label>
              <input className={`${inputCls} font-mono`} style={inputStyle}
                placeholder="NmL1JHigVrfdJINa0i2VP6LC3sYpT9Xx" value={form.enc_key}
                onChange={e => setForm(p => ({ ...p, enc_key: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">HEADER 인증키 (OnlineAK) *</label>
              <input className={`${inputCls} font-mono`} style={inputStyle}
                placeholder="vFtQxk4AZp7nbhy5mBhx/OoQlXm..." value={form.online_ak}
                onChange={e => setForm(p => ({ ...p, online_ak: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">설명 (선택)</label>
              <input className={inputCls} style={inputStyle}
                placeholder="예: 카운터 1번 단말기용" value={form.description ?? ''}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded text-sm text-white disabled:opacity-50 transition-all"
                style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded text-sm text-white/60 hover:text-white/80 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 환경 필터 탭 */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {([['all', '전체'], ['production', '운영'], ['development', '개발']] as [EnvFilter, string][]).map(([val, label]) => (
          <button key={val} onClick={() => setEnvFilter(val)}
            className="px-4 py-1.5 rounded text-sm font-medium transition-all"
            style={envFilter === val
              ? { background: 'rgba(96,165,250,0.30)', color: 'rgb(147,197,253)' }
              : { color: 'rgba(255,255,255,0.45)' }}>
            {label}
            <span className="ml-1.5 text-xs opacity-60">
              {val === 'all' ? keys.length : keys.filter(k => k.env === val).length}
            </span>
          </button>
        ))}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-white/50">이름</th>
              <th className="text-left px-4 py-3 text-white/50">환경</th>
              <th className="text-left px-4 py-3 text-white/50">MID</th>
              <th className="text-left px-4 py-3 text-white/50">암복호화 KEY</th>
              <th className="text-left px-4 py-3 text-white/50">HEADER 인증키</th>
              <th className="text-center px-4 py-3 text-white/50">상태</th>
              <th className="text-right px-4 py-3 text-white/50">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(k => (
              <tr key={k.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-medium text-white">
                  {k.name}
                  {k.description && <p className="text-xs text-white/35 mt-0.5">{k.description}</p>}
                </td>
                <td className="px-4 py-3"><EnvBadge env={k.env ?? 'production'} /></td>
                <td className="px-4 py-3 font-mono text-xs text-white/80">{k.mid}</td>
                <td className="px-4 py-3 font-mono text-xs text-white/40">{k.enc_key.substring(0, 8)}••••••••</td>
                <td className="px-4 py-3 font-mono text-xs text-white/40">{k.online_ak.substring(0, 8)}••••••••</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggle(k)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      k.is_active ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/40'
                    }`}>
                    {k.is_active ? '활성' : '비활성'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(k)} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">수정</button>
                  <button onClick={() => handleDelete(k.id)} className="text-red-400 hover:text-red-300 text-xs transition-colors">삭제</button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  {envFilter === 'all'
                    ? '등록된 키가 없습니다. 키 등록 버튼을 눌러 3종 키를 등록하세요.'
                    : `${envFilter === 'production' ? '운영' : '개발'} 환경 키가 없습니다.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
