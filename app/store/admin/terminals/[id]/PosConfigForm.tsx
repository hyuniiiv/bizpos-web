'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DeviceConfig, MenuConfig } from '@/types/menu'

type TerminalType = 'ticket_checker' | 'pos' | 'kiosk' | 'table_order'
const TYPE_LABELS: Record<TerminalType, string> = {
  ticket_checker: '식권체크기', pos: 'POS', kiosk: 'KIOSK', table_order: '테이블 오더',
}

type Terminal = {
  id: string; term_id: string; name: string; corner: string
  status: string; terminal_type: TerminalType | null
  last_seen_at: string | null; activation_code: string | null; access_token: string | null
}

type FullConfig = Partial<DeviceConfig> & { menus?: MenuConfig[] }
type Tab = 'info' | 'device' | 'menus'

function emptyMenu(): MenuConfig {
  return {
    id: crypto.randomUUID(), name: '', displayAmount: 0, paymentAmount: 0,
    mealType: 'lunch', startTime: '11:00', endTime: '13:00',
    soundFile: '', isActive: true, count: 0,
  }
}

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'
const labelCls = 'block text-sm font-semibold text-white/60 mb-1.5'

export default function PosConfigForm({
  terminalId, initialConfig, currentVersion, terminal,
}: {
  terminalId: string
  initialConfig: FullConfig | null
  currentVersion: number
  terminal: Terminal
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('info')

  // 단말기 정보
  const [name, setName] = useState(terminal.name ?? '')
  const [corner, setCorner] = useState(terminal.corner ?? '')
  const [termId, setTermId] = useState(terminal.term_id ?? '')
  const [terminalType, setTerminalType] = useState<TerminalType>(terminal.terminal_type ?? 'ticket_checker')
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoSuccess, setInfoSuccess] = useState(false)
  const [infoError, setInfoError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // 기기설정
  const [device, setDevice] = useState<Partial<DeviceConfig>>({
    termId: '', merchantId: '', bizNo: '',
    corner: '', adminPin: '', serialPort: 'COM3',
    offlineMode: false, apiEnv: 'development',
    autoResetTime: '00:00', barcodeReaderType: 'keyboard', barcodePort: 'COM4',
    cafeteriaMode: false,
    ...(initialConfig ?? {}),
  })
  const [menus, setMenus] = useState<MenuConfig[]>(initialConfig?.menus ?? [])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const d = (k: keyof DeviceConfig, v: string | boolean) => setDevice(prev => ({ ...prev, [k]: v }))

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setInfoSaving(true); setInfoError(''); setInfoSuccess(false)
    const res = await fetch(`/api/terminals/${terminal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, corner, term_id: termId.toString().padStart(2, '0'), terminal_type: terminalType }),
    })
    setInfoSaving(false)
    if (!res.ok) { const data = await res.json(); setInfoError(data.error ?? '저장 실패') }
    else { setInfoSuccess(true); router.refresh() }
  }

  const handleRegenCode = async () => {
    if (!confirm('재발급하면 현재 단말기 연결이 끊어집니다. 계속하시겠습니까?')) return
    await fetch(`/api/terminals/${terminal.id}/revoke`, { method: 'POST' })
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const res = await fetch(`/api/terminals/${terminal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activation_code: newCode }),
    })
    if (res.ok) router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('단말기를 삭제하면 관련 거래내역도 모두 삭제됩니다. 계속하시겠습니까?')) return
    setDeleting(true)
    const res = await fetch(`/api/terminals/${terminal.id}`, { method: 'DELETE' })
    if (res.ok) { router.push('/store/admin/terminals'); router.refresh() }
    else { const data = await res.json(); setInfoError(data.error ?? '삭제 실패'); setDeleting(false) }
  }

  const handleSaveConfig = async () => {
    setSaving(true); setError(''); setSuccess(false)
    const res = await fetch(`/api/terminals/${terminalId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...device, menus }),
    })
    setSaving(false)
    if (!res.ok) { const data = await res.json(); setError(data.error ?? '저장 실패') }
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
  }

  const TABS: [Tab, string][] = [
    ['info', '단말기 정보'],
    ['device', '기기 설정'],
    ['menus', `메뉴 관리 (${menus.length})`],
  ]

  return (
    <div className="glass-card rounded-xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <h2 className="font-semibold text-white text-base">단말기 설정</h2>
          {currentVersion > 0 && (
            <p className="text-sm text-white/40 mt-0.5">현재 버전 v{currentVersion} — 배포 시 POS가 30초 내 자동 수신</p>
          )}
        </div>
        {tab !== 'info' && (
          <button onClick={handleSaveConfig} disabled={saving}
            className="px-4 py-3 rounded-lg text-base text-white disabled:opacity-50 transition-all"
            style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
            {saving ? '저장 중...' : '설정 배포'}
          </button>
        )}
      </div>

      {error && <p className="px-5 pt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="px-5 pt-3 text-sm text-green-400">✓ 저장되었습니다. POS가 다음 폴링 시 수신합니다.</p>}

      {/* 탭 */}
      <div className="flex border-b border-white/10 px-5 gap-4">
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-3 text-base font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-blue-400 text-blue-300' : 'border-transparent text-white/50 hover:text-white/70'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* 단말기 정보 탭 */}
        {tab === 'info' && (
          <div className="space-y-4">
            {/* 현재 상태 */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide">현재 상태</h3>
              <div className="grid grid-cols-2 gap-y-3 text-base">
                <span className="text-white/50">연결 상태</span>
                <span className={`font-medium ${terminal.status === 'online' ? 'text-green-400' : 'text-white/40'}`}>
                  {terminal.status === 'online' ? '🟢 온라인' : '⚫ 오프라인'}
                </span>
                <span className="text-white/50">마지막 접속</span>
                <span className="text-white/70">
                  {terminal.last_seen_at ? new Date(terminal.last_seen_at).toLocaleString('ko-KR') : '미접속'}
                </span>
                <span className="text-white/50">활성화 코드</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {terminal.access_token ? (
                    <span className="text-sm text-green-400 font-medium">활성화 완료</span>
                  ) : (
                    <span className="font-mono text-yellow-300 px-2 py-1 rounded text-sm"
                      style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.30)' }}>
                      {terminal.activation_code}
                    </span>
                  )}
                  <button onClick={handleRegenCode} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">재발급</button>
                </div>
              </div>
            </div>

            {/* 정보 편집 폼 */}
            <form onSubmit={handleSaveInfo} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>단말기 ID</label>
                  <input type="number" value={parseInt(termId) || 1} onChange={e => setTermId(e.target.value)}
                    min={1} max={99} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>단말기 타입</label>
                  <select value={terminalType} onChange={e => setTerminalType(e.target.value as TerminalType)}
                    className={inputCls} style={{ ...inputStyle, background: 'rgba(255,255,255,0.10)' }}>
                    {(Object.entries(TYPE_LABELS) as [TerminalType, string][]).map(([val, label]) => (
                      <option key={val} value={val} style={{ background: '#0F1B4C' }}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>단말기 이름</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="1번 단말기" />
              </div>
              <div>
                <label className={labelCls}>코너명</label>
                <input value={corner} onChange={e => setCorner(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="A코너" />
              </div>
              {infoError && <p className="text-sm text-red-400">{infoError}</p>}
              {infoSuccess && <p className="text-sm text-green-400">저장되었습니다.</p>}
              <button type="submit" disabled={infoSaving}
                className="w-full rounded-lg py-3 text-base text-white disabled:opacity-50 transition-all"
                style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
                {infoSaving ? '저장 중...' : '저장'}
              </button>
            </form>

            {/* 위험 구역 */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <h3 className="text-sm font-semibold text-red-400">위험 구역</h3>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2.5 rounded-lg text-base text-red-300 hover:text-red-200 disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}>
                {deleting ? '삭제 중...' : '단말기 삭제'}
              </button>
            </div>
          </div>
        )}

        {/* 기기 설정 탭 */}
        {tab === 'device' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>단말기 ID (2자리)</label>
              <input className={inputCls} style={inputStyle} maxLength={2} value={device.termId ?? ''} onChange={e => d('termId', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>코너명</label>
              <input className={inputCls} style={inputStyle} value={device.corner ?? ''} onChange={e => d('corner', e.target.value)} placeholder="구내식당" />
            </div>
            <div>
              <label className={labelCls}>가맹점코드 (MID)</label>
              <input className={`${inputCls} font-mono`} style={inputStyle} value={device.merchantId ?? ''} onChange={e => d('merchantId', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>사업자번호</label>
              <input className={inputCls} style={inputStyle} value={device.bizNo ?? ''} onChange={e => d('bizNo', e.target.value)} placeholder="000-00-00000" />
            </div>
            <div>
              <label className={labelCls}>관리자 PIN (변경 시만 입력)</label>
              <input type="password" className={inputCls} style={inputStyle} placeholder="변경하지 않으려면 비워두세요" onChange={e => d('adminPin', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>자동 초기화 시각</label>
              <input type="time" className={inputCls} style={inputStyle} value={device.autoResetTime ?? '00:00'} onChange={e => d('autoResetTime', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>시리얼 포트</label>
              <input className={inputCls} style={inputStyle} value={device.serialPort ?? 'COM3'} onChange={e => d('serialPort', e.target.value)} placeholder="COM3" />
            </div>
            <div>
              <label className={labelCls}>바코드 리더 포트</label>
              <input className={inputCls} style={inputStyle} value={device.barcodePort ?? 'COM4'} onChange={e => d('barcodePort', e.target.value)} placeholder="COM4" />
            </div>
            <div>
              <label className={labelCls}>바코드 입력 방식</label>
              <select className={inputCls} style={inputStyle} value={device.barcodeReaderType ?? 'keyboard'} onChange={e => d('barcodeReaderType', e.target.value as DeviceConfig['barcodeReaderType'])}>
                <option value="keyboard" style={{ background: '#0F1B4C' }}>키보드 (HID)</option>
                <option value="serial" style={{ background: '#0F1B4C' }}>시리얼 포트</option>
                <option value="camera" style={{ background: '#0F1B4C' }}>카메라</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>API 환경</label>
              <select className={inputCls} style={inputStyle} value={device.apiEnv ?? 'development'} onChange={e => d('apiEnv', e.target.value as DeviceConfig['apiEnv'])}>
                <option value="production" style={{ background: '#0F1B4C' }}>운영 (Production)</option>
                <option value="development" style={{ background: '#0F1B4C' }}>개발 (Development)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
                <input type="checkbox" checked={device.offlineMode ?? false} onChange={e => d('offlineMode', e.target.checked)} />
                오프라인 모드 강제 활성화
              </label>
            </div>
            <div className="col-span-2 pt-1 border-t border-white/10">
              <label className="flex items-center gap-2 text-base cursor-pointer"
                style={{ color: device.cafeteriaMode ? '#06D6A0' : 'rgba(255,255,255,0.70)' }}>
                <input type="checkbox" checked={device.cafeteriaMode ?? false} onChange={e => d('cafeteriaMode', e.target.checked)} />
                학생식당 모드 (판매현황 동시 표시)
              </label>
              <p className="text-xs text-white/35 mt-1 ml-6">
                활성화 시 태블릿 가로(768px+)에서 스캔 화면과 사용이력이 함께 표시됩니다.
              </p>
            </div>
            {/* inputPolicy 설정 */}
            <div className="col-span-2 space-y-3 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300">입력 타입별 동작 설정</h3>
              {(['barcode', 'qr', 'rfcard'] as const).map(inputType => (
                <div key={inputType} className="flex items-center gap-3">
                  <label className="w-20 text-sm text-gray-400">
                    {inputType === 'barcode' ? '바코드' : inputType === 'qr' ? 'QR코드' : 'RF카드'}
                  </label>
                  <select
                    value={device.inputPolicy?.[inputType] ?? 'bizplay_payment'}
                    onChange={e => {
                      const newPolicy = {
                        ...(device.inputPolicy ?? { barcode: 'bizplay_payment', qr: 'bizplay_payment', rfcard: 'bizplay_payment' }),
                        [inputType]: e.target.value,
                      }
                      setDevice((prev: Partial<DeviceConfig>) => ({ ...prev, inputPolicy: newPolicy }))
                    }}
                    className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm"
                    style={{ color: 'white' }}
                  >
                    <option value="bizplay_payment" style={{ background: '#0F1B4C' }}>Bizplay 결제</option>
                    <option value="meal_record" style={{ background: '#0F1B4C' }}>식수 기록</option>
                    <option value="disabled" style={{ background: '#0F1B4C' }}>비활성화</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메뉴 관리 탭 */}
        {tab === 'menus' && (
          <div className="space-y-3">
            {menus.map((menu, i) => (
              <div key={menu.id} className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/50">메뉴 #{i + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-white/60 cursor-pointer">
                      <input type="checkbox" checked={menu.isActive} onChange={e => {
                        const updated = [...menus]; updated[i] = { ...menu, isActive: e.target.checked }; setMenus(updated)
                      }} />
                      활성
                    </label>
                    <button onClick={() => setMenus(menus.filter((_, j) => j !== i))} className="text-sm text-red-400 hover:text-red-300 transition-colors">삭제</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>메뉴 이름</label>
                    <input className={inputCls} style={inputStyle} value={menu.name} placeholder="조식"
                      onChange={e => { const u = [...menus]; u[i] = { ...menu, name: e.target.value }; setMenus(u) }} />
                  </div>
                  <div>
                    <label className={labelCls}>표시 금액 (원)</label>
                    <input type="number" className={inputCls} style={inputStyle} value={menu.displayAmount}
                      onChange={e => { const u = [...menus]; u[i] = { ...menu, displayAmount: parseInt(e.target.value) || 0 }; setMenus(u) }} />
                  </div>
                  <div>
                    <label className={labelCls}>결제 금액 (원)</label>
                    <input type="number" className={inputCls} style={inputStyle} value={menu.paymentAmount}
                      onChange={e => { const u = [...menus]; u[i] = { ...menu, paymentAmount: parseInt(e.target.value) || 0 }; setMenus(u) }} />
                  </div>
                  <div>
                    <label className={labelCls}>식사 구분</label>
                    <select className={inputCls} style={inputStyle} value={menu.mealType}
                      onChange={e => { const u = [...menus]; u[i] = { ...menu, mealType: e.target.value as MenuConfig['mealType'] }; setMenus(u) }}>
                      <option value="breakfast" style={{ background: '#0F1B4C' }}>조식</option>
                      <option value="lunch" style={{ background: '#0F1B4C' }}>중식</option>
                      <option value="dinner" style={{ background: '#0F1B4C' }}>석식</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={labelCls}>시작 시각</label>
                      <input type="time" className={inputCls} style={inputStyle} value={menu.startTime}
                        onChange={e => { const u = [...menus]; u[i] = { ...menu, startTime: e.target.value }; setMenus(u) }} />
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>종료 시각</label>
                      <input type="time" className={inputCls} style={inputStyle} value={menu.endTime}
                        onChange={e => { const u = [...menus]; u[i] = { ...menu, endTime: e.target.value }; setMenus(u) }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setMenus([...menus, emptyMenu()])}
              className="w-full py-3 rounded-lg text-base text-white/50 hover:text-white/80 transition-colors"
              style={{ border: '2px dashed rgba(255,255,255,0.15)' }}>
              + 메뉴 추가
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
