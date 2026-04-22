import type { MenuConfig, MealType } from '@/types/menu'

interface MenuSettingFormProps {
  editing: MenuConfig | null
  form: Partial<MenuConfig>
  onChange: (updates: Partial<MenuConfig>) => void
  onSave: () => void
  onClose: () => void
}

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'

export function MenuSettingForm({ editing, form, onChange, onSave, onClose }: MenuSettingFormProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md">
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
