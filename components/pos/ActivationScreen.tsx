'use client'
import { useState } from 'react'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { useMenuStore } from '@/lib/store/menuStore'
import { getServerUrl } from '@/lib/serverUrl'

export default function ActivationScreen() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setDeviceToken, updateConfig, setTerminalType } = useSettingsStore()
  const { setMenus, setPeriods, setServiceCodes } = useMenuStore()

  const handleActivate = async () => {
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      // 활성화는 서버 전용 시크릿(SUPABASE_SERVICE_ROLE_KEY, TERMINAL_JWT_SECRET)이
      // 필요하므로 로컬 Electron server가 아닌 운영(Vercel) 서버로 호출.
      const res = await fetch(getServerUrl() + '/api/device/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activationCode: code.toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'INVALID_CODE') setError('유효하지 않은 활성화 코드입니다.')
        else if (data.error === 'ALREADY_ACTIVATED') setError('이미 활성화된 단말기입니다. 관리자에게 문의하세요.')
        else setError('활성화에 실패했습니다.')
        return
      }
      setDeviceToken(data.accessToken, data.terminalId)
      if (data.terminalType) setTerminalType(data.terminalType)
      const cfg = data.config ?? {}
      await updateConfig({
        termId: data.termId ?? '',
        ...(data.name ? { termName: data.name } : {}),
        ...(data.corner ? { corner: data.corner } : {}),
        ...cfg,
      })
      if (Array.isArray(cfg.menus)) setMenus(cfg.menus)
      if (Array.isArray(cfg.periods)) setPeriods(cfg.periods)
      if (Array.isArray(cfg.serviceCodes)) setServiceCodes(cfg.serviceCodes)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="glass-strong rounded-3xl p-8 w-full max-w-xs text-center">
        <div className="text-4xl mb-4">📱</div>
        <h2 className="text-lg font-bold text-white mb-1">단말기 활성화</h2>
        <p className="text-sm text-white/45 mb-5">관리자 콘솔에서 발급받은 활성화 코드를 입력하세요</p>
        <input
          type="text"
          className="w-full rounded-xl px-4 py-3 text-center text-xl tracking-widest uppercase mb-3 focus:outline-none text-white font-bold"
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
          maxLength={6}
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleActivate()}
          placeholder="XXXXXX"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={handleActivate}
          disabled={loading || code.length < 6}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: 'rgba(96, 165, 250, 0.30)', border: '1px solid rgba(96, 165, 250, 0.50)' }}
          onMouseEnter={e => !loading && code.length >= 6 && (e.currentTarget.style.background = 'rgba(96, 165, 250, 0.50)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(96, 165, 250, 0.30)')}
        >
          {loading ? '활성화 중...' : '활성화'}
        </button>
        <a href="/pos/admin" className="mt-3 block text-sm text-white/30 hover:text-white/60 transition-colors">
          수동 설정으로 진입 →
        </a>
      </div>
    </div>
  )
}
