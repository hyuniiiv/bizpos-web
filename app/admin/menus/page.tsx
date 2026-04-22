'use client'
import { useState, useEffect } from 'react'
import { useMenuStore } from '@/lib/store/menuStore'
import type { MenuConfig, MealType } from '@/types/menu'
import { MenuSettingForm } from '@/components/admin/MenuSettingForm'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '조식',
  lunch: '중식',
  dinner: '석식',
}

interface PeriodConfig {
  startTime: string
  endTime: string
}

const DEFAULT_PERIODS: Record<MealType, PeriodConfig> = {
  breakfast: { startTime: '07:00', endTime: '09:00' },
  lunch:     { startTime: '11:30', endTime: '13:00' },
  dinner:    { startTime: '17:00', endTime: '19:00' },
}

const PERIODS_KEY = 'bizpos_meal_periods'

function loadPeriods(): Record<MealType, PeriodConfig> {
  if (typeof window === 'undefined') return DEFAULT_PERIODS
  try {
    const raw = localStorage.getItem(PERIODS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_PERIODS
  } catch {
    return DEFAULT_PERIODS
  }
}

function savePeriods(periods: Record<MealType, PeriodConfig>) {
  localStorage.setItem(PERIODS_KEY, JSON.stringify(periods))
}

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }

export default function MenusPage() {
  const { menus, addMenu, updateMenu, deleteMenu } = useMenuStore()
  const [editing, setEditing] = useState<MenuConfig | null>(null)
  const [form, setForm] = useState<Partial<MenuConfig>>({})
  const [showForm, setShowForm] = useState(false)

  const [periods, setPeriods] = useState<Record<MealType, PeriodConfig>>(DEFAULT_PERIODS)
  const [editingPeriods, setEditingPeriods] = useState(false)
  const [periodDraft, setPeriodDraft] = useState<Record<MealType, PeriodConfig>>(DEFAULT_PERIODS)

  useEffect(() => {
    setPeriods(loadPeriods())
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({
      mealType: 'lunch', name: '', displayAmount: 8000, paymentAmount: 8000,
      startTime: '11:30', endTime: '13:00', soundFile: 'success.mp3', isActive: true,
    })
    setShowForm(true)
  }

  const openEdit = (m: MenuConfig) => {
    setEditing(m)
    setForm({ ...m })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name || !form.startTime || !form.endTime) return
    if (editing) {
      updateMenu(editing.id, form)
    } else {
      addMenu(form as Omit<MenuConfig, 'id' | 'count'>)
    }
    setShowForm(false)
    setForm({})
  }

  const openPeriodEdit = () => {
    setPeriodDraft({ ...periods })
    setEditingPeriods(true)
  }

  const savePeriodEdit = () => {
    setPeriods(periodDraft)
    savePeriods(periodDraft)
    setEditingPeriods(false)
  }

  const grouped = (Object.keys(MEAL_LABELS) as MealType[]).map(mt => ({
    mealType: mt,
    label: MEAL_LABELS[mt],
    menus: menus.filter(m => m.mealType === mt),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">메뉴 설정</h2>
        <button
          onClick={openAdd}
          className="px-5 py-3 rounded-lg text-base font-medium text-white transition-all"
          style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}
        >
          + 메뉴 추가
        </button>
      </div>

      {/* 식사시간대 기본 설정 */}
      <div className="glass-card rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/80">식사시간대 기본 설정</h3>
          {!editingPeriods ? (
            <button onClick={openPeriodEdit} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">수정</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditingPeriods(false)} className="text-sm text-white/50 hover:text-white/70 transition-colors">취소</button>
              <button onClick={savePeriodEdit} className="text-sm text-blue-400 font-semibold hover:text-blue-300 transition-colors">저장</button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(Object.keys(MEAL_LABELS) as MealType[]).map(mt => (
            <div key={mt} className="space-y-1">
              <p className="text-sm font-semibold text-white/50">{MEAL_LABELS[mt]}</p>
              {editingPeriods ? (
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={periodDraft[mt].startTime}
                    onChange={e => setPeriodDraft(d => ({ ...d, [mt]: { ...d[mt], startTime: e.target.value } }))}
                    className="rounded px-3 py-2 text-sm w-full text-white focus:outline-none"
                    style={inputStyle}
                  />
                  <span className="text-white/40 text-sm">~</span>
                  <input
                    type="time"
                    value={periodDraft[mt].endTime}
                    onChange={e => setPeriodDraft(d => ({ ...d, [mt]: { ...d[mt], endTime: e.target.value } }))}
                    className="rounded px-3 py-2 text-sm w-full text-white focus:outline-none"
                    style={inputStyle}
                  />
                </div>
              ) : (
                <p className="text-base text-white font-mono">
                  {periods[mt].startTime} ~ {periods[mt].endTime}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 메뉴 목록 */}
      {grouped.map(({ mealType, label, menus: mealMenus }) => (
        <div key={mealType} className="mb-6">
          <h3 className="text-sm font-semibold text-white/50 mb-2">{label}</h3>
          <div className="glass-card rounded-xl overflow-hidden">
            {mealMenus.length === 0 ? (
              <p className="px-4 py-6 text-center text-white/40 text-base">메뉴가 없습니다</p>
            ) : (
              <table className="w-full text-base">
                <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm text-white/50">메뉴명</th>
                    <th className="px-4 py-3 text-right text-sm text-white/50">화면금액</th>
                    <th className="px-4 py-3 text-right text-sm text-white/50">결제금액</th>
                    <th className="px-4 py-3 text-center text-sm text-white/50">판매시간</th>
                    <th className="px-4 py-3 text-center text-sm text-white/50">사운드</th>
                    <th className="px-4 py-3 text-center text-sm text-white/50">활성</th>
                    <th className="px-4 py-3 text-center text-sm text-white/50">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mealMenus.map(m => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 font-medium text-white">{m.name}</td>
                      <td className="px-4 py-4 text-right text-white/80">{m.displayAmount.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right text-white/80">{m.paymentAmount.toLocaleString()}</td>
                      <td className="px-4 py-4 text-center text-white/60 text-base">{m.startTime}~{m.endTime}</td>
                      <td className="px-4 py-4 text-center text-white/50 text-base">{m.soundFile}</td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => updateMenu(m.id, { isActive: !m.isActive })}>
                          <span className={`w-12 h-6 rounded-full inline-flex transition-colors ${m.isActive ? 'bg-green-500' : 'bg-white/20'}`}>
                            <span className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${m.isActive ? 'translate-x-6' : ''}`} />
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => openEdit(m)} className="text-blue-400 hover:text-blue-300 text-base mr-3 transition-colors">수정</button>
                        <button onClick={() => deleteMenu(m.id)} className="text-red-400 hover:text-red-300 text-base transition-colors">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ))}

      {showForm && (
        <MenuSettingForm
          editing={editing}
          form={form}
          onChange={updates => setForm(f => ({ ...f, ...updates }))}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setForm({}) }}
        />
      )}
    </div>
  )
}
