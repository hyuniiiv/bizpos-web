import { useState } from 'react'
import type { MenuConfig, MealType, MenuServiceCode } from '@/types/menu'

interface MenuSettingFormProps {
  editing: MenuConfig | null
  form: Partial<MenuConfig>
  onChange: (updates: Partial<MenuConfig>) => void
  onSave: () => void
  onClose: () => void
}

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'
const inputSmCls = 'rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none'

export function MenuSettingForm({ editing, form, onChange, onSave, onClose }: MenuSettingFormProps) {
  const [newSvc, setNewSvc] = useState({ code: '', amount: '', description: '' })
  const serviceCodes = form.serviceCodes ?? []

  const handleAddSvc = () => {
    if (!newSvc.code) return
    const entry: MenuServiceCode = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      code: newSvc.code,
      amount: Number(newSvc.amount) || 0,
      ...(newSvc.description ? { description: newSvc.description } : {}),
    }
    onChange({ serviceCodes: [...serviceCodes, entry] })
    setNewSvc({ code: '', amount: '', description: '' })
  }

  const handleDeleteSvc = (id: string) => {
    onChange({ serviceCodes: serviceCodes.filter(s => s.id !== id) })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-6">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-xl font-bold text-white mb-4">{editing ? '메뉴 수정' : '메뉴 추가'}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-white/60 mb-1.5 block">구분</label>
            <select
              className={inputCls}
              style={{ ...inputStyle, color: 'white' }}
              value={form.mealType}
              onChange={e => onChange({ mealType: e.target.value as MealType })}
            >
              <option value="breakfast" style={{ background: '#0F1B4C' }}>조식</option>
              <option value="lunch" style={{ background: '#0F1B4C' }}>중식</option>
              <option value="dinner" style={{ background: '#0F1B4C' }}>석식</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-white/60 mb-1.5 block">메뉴명</label>
            <input
              className={inputCls}
              style={inputStyle}
              value={form.name ?? ''}
              onChange={e => onChange({ name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-white/60 mb-1.5 block">화면표시금액</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                value={form.displayAmount ?? ''}
                onChange={e => onChange({ displayAmount: +e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-white/60 mb-1.5 block">결제금액</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                value={form.paymentAmount ?? ''}
                onChange={e => onChange({ paymentAmount: +e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-white/60 mb-1.5 block">시작시간</label>
              <input
                type="time"
                className={inputCls}
                style={inputStyle}
                value={form.startTime ?? ''}
                onChange={e => onChange({ startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-white/60 mb-1.5 block">종료시간</label>
              <input
                type="time"
                className={inputCls}
                style={inputStyle}
                value={form.endTime ?? ''}
                onChange={e => onChange({ endTime: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-white/60 mb-1.5 block">사운드 파일</label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="success.mp3"
              value={form.soundFile ?? ''}
              onChange={e => onChange({ soundFile: e.target.value })}
            />
          </div>

          {/* 메뉴별 서비스 구분코드 */}
          <div>
            <label className="text-sm font-semibold text-white/60 mb-2 block">메뉴별 서비스 구분코드</label>
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
              {serviceCodes.length === 0 && (
                <p className="text-xs text-white/30 text-center py-1">등록된 코드 없음</p>
              )}
              {serviceCodes.map(sc => (
                <div key={sc.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span className="font-mono text-sm bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded w-12 text-center shrink-0">{sc.code}</span>
                  <span className="text-sm text-white/60 flex-1 truncate">{sc.description || '—'}</span>
                  <span className="text-sm font-semibold text-white shrink-0">{sc.amount.toLocaleString()}원</span>
                  <button onClick={() => handleDeleteSvc(sc.id)} className="text-red-400/60 hover:text-red-400 text-xs shrink-0 transition-colors">삭제</button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  className={`w-14 shrink-0 ${inputSmCls}`}
                  style={inputStyle}
                  placeholder="코드"
                  maxLength={2}
                  value={newSvc.code}
                  onChange={e => setNewSvc(n => ({ ...n, code: e.target.value }))}
                />
                <input
                  className={`flex-1 ${inputSmCls}`}
                  style={inputStyle}
                  placeholder="설명 (선택)"
                  value={newSvc.description}
                  onChange={e => setNewSvc(n => ({ ...n, description: e.target.value }))}
                />
                <input
                  type="number"
                  className={`w-20 shrink-0 ${inputSmCls}`}
                  style={inputStyle}
                  placeholder="금액"
                  value={newSvc.amount}
                  onChange={e => setNewSvc(n => ({ ...n, amount: e.target.value }))}
                />
                <button
                  onClick={handleAddSvc}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-white shrink-0 transition-all"
                  style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-base text-white/60 hover:text-white/80 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.18)' }}
          >
            취소
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-3 rounded-lg text-base font-semibold text-white transition-all"
            style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
