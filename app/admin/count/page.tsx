'use client'
import { useState } from 'react'
import { useMenuStore } from '@/lib/store/menuStore'
import { useSettingsStore } from '@/lib/store/settingsStore'

const MEAL_LABELS: Record<string, string> = { breakfast: '조식', lunch: '중식', dinner: '석식' }

export default function CountPage() {
  const { menus, resetCount } = useMenuStore()
  const { config } = useSettingsStore()
  const [confirmReset, setConfirmReset] = useState<string | null>(null)
  const autoResetTime = config.autoResetTime ?? '00:00'

  const totalCount = menus.reduce((sum, m) => sum + m.count, 0)

  const handleReset = (menuId?: string) => {
    resetCount(menuId)
    setConfirmReset(null)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">식수 카운트 관리</h2>
        <button
          onClick={() => setConfirmReset('all')}
          className="px-5 py-3 rounded-lg text-base font-medium text-white transition-all"
          style={{ background: 'rgba(239,68,68,0.30)', border: '1px solid rgba(239,68,68,0.50)' }}
        >
          전체 초기화
        </button>
      </div>

      {/* 전체 카운트 */}
      <div className="glass-card rounded-2xl p-6 mb-6 text-center glow-blue">
        <p className="text-white/60 text-base mb-1">전체 카운트</p>
        <p className="text-6xl font-black text-white">{totalCount.toLocaleString()}</p>
      </div>

      {/* 메뉴별 카운트 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-base font-semibold text-white/70">메뉴별 현황</p>
        </div>
        {menus.length === 0 ? (
          <p className="px-4 py-8 text-center text-white/40 text-base">설정된 메뉴가 없습니다</p>
        ) : (
          <table className="w-full text-base">
            <thead className="border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-white/50">구분</th>
                <th className="px-4 py-3 text-left text-sm text-white/50">메뉴명</th>
                <th className="px-4 py-3 text-left text-sm text-white/50">판매시간</th>
                <th className="px-4 py-3 text-right text-sm text-white/50">카운트</th>
                <th className="px-4 py-3 text-center text-sm text-white/50">초기화</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {menus.map(m => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4">
                    <span className="text-base bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-medium">
                      {MEAL_LABELS[m.mealType]}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-medium text-white">{m.name}</td>
                  <td className="px-4 py-4 text-white/50 text-base">{m.startTime}~{m.endTime}</td>
                  <td className="px-4 py-4 text-right font-black text-2xl text-white">
                    {m.count}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => setConfirmReset(m.id)}
                      className="px-4 py-3 text-base rounded-lg text-white/60 hover:text-white/80 transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                    >
                      초기화
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr>
                <td colSpan={3} className="px-4 py-4 text-base font-semibold text-white/70">합계</td>
                <td className="px-4 py-4 text-right font-black text-2xl text-white">{totalCount}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* 설정 안내 */}
      <div className="mt-4 p-4 rounded-xl text-sm text-blue-300" style={{ background: 'rgba(96,165,250,0.10)', border: '1px solid rgba(96,165,250,0.25)' }}>
        <p className="font-semibold mb-1">자동 초기화 설정</p>
        <p>· 매일 <span className="font-semibold text-blue-300">{autoResetTime}</span>에 전체 카운트 자동 초기화</p>
        <p>· 자동 초기화 시각은 단말기 설정 → 기기설정에서 변경 가능</p>
      </div>

      {/* 확인 모달 */}
      {confirmReset !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-strong rounded-2xl p-6 w-80 text-center">
            <p className="font-semibold text-white mb-2">카운트를 초기화하시겠습니까?</p>
            <p className="text-base text-white/60 mb-5">
              {confirmReset === 'all' ? '전체 메뉴의 카운트가 0으로 초기화됩니다.' : '선택한 메뉴의 카운트가 0으로 초기화됩니다.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(null)}
                className="flex-1 py-3 rounded-lg text-base text-white/60 hover:text-white/80 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.18)' }}>취소</button>
              <button onClick={() => handleReset(confirmReset === 'all' ? undefined : confirmReset)}
                className="flex-1 py-3 rounded-lg text-base font-semibold text-white transition-all"
                style={{ background: 'rgba(239,68,68,0.35)', border: '1px solid rgba(239,68,68,0.55)' }}>초기화</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
