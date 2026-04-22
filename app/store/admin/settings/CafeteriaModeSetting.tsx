'use client'

import { useSettingsStore } from '@/lib/store/settingsStore'

export default function CafeteriaModeSetting() {
  const { config, updateConfig } = useSettingsStore()
  const enabled = config.cafeteriaMode ?? false

  const toggle = async () => {
    await updateConfig({ cafeteriaMode: !enabled })
  }

  return (
    <section className="bp-card rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold border-b pb-2"
          style={{ color: 'var(--bp-text-2)', borderColor: 'var(--bp-border)' }}>
        POS 단말기 모드
      </h2>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--bp-text)' }}>학생식당 모드</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
            활성화 시 태블릿 가로(768px+)에서 스캔 화면과 판매현황·사용이력이 동시에 표시됩니다.
          </p>
        </div>
        <button
          onClick={toggle}
          role="switch"
          aria-checked={enabled}
          className="flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
          style={{ background: enabled ? '#06D6A0' : 'rgba(255,255,255,0.15)' }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            style={{ transform: enabled ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
          />
        </button>
      </div>
      <p className="text-xs" style={{ color: enabled ? '#06D6A0' : 'var(--bp-text-3)' }}>
        현재: <strong>{enabled ? '학생식당 모드 켜짐' : '일반 모드'}</strong>
        {' '}— 이 설정은 이 브라우저(단말기)에만 적용됩니다.
      </p>
    </section>
  )
}
