'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DeviceConfig, MenuConfig, MenuServiceCode } from '@/types/menu'

type TerminalType = 'ticket_checker' | 'pos' | 'kiosk' | 'table_order'
const TYPE_LABELS: Record<TerminalType, string> = {
  ticket_checker: '식권체크기', pos: 'POS', kiosk: 'KIOSK', table_order: '테이블 오더',
}

type MerchantKey = { id: string; name: string; mid: string; is_active: boolean }
type Store = { id: string; store_name: string }

type Terminal = {
  id: string; term_id: string; name: string; corner: string
  status: string; terminal_type: TerminalType | null
  last_seen_at: string | null; activation_code: string | null; access_token: string | null
  merchant_key_id?: string | null; store_id?: string | null
  current_app_version?: string | null
}

type FullConfig = Partial<DeviceConfig> & { menus?: MenuConfig[]; generalMenus?: GeneralMenuItem[] }
type Tab = 'info' | 'device' | 'menus'

interface GeneralMenuItem {
  id: string
  name: string
  price: number
  days: number[]
  startTime: string
  endTime: string
  isActive: boolean
  serviceCodes?: MenuServiceCode[]
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function emptyMenu(): MenuConfig {
  return {
    id: crypto.randomUUID(), name: '', displayAmount: 0, paymentAmount: 0,
    mealType: 'lunch', startTime: '11:00', endTime: '13:00',
    soundFile: '', isActive: true, count: 0,
  }
}

function emptyGeneralMenu(): GeneralMenuItem {
  return {
    id: crypto.randomUUID(), name: '', price: 0,
    days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00', isActive: true,
  }
}

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'
const labelCls = 'block text-sm font-semibold text-white/60 mb-1.5'

export default function PosConfigForm({
  terminalId, initialConfig, currentVersion, terminal, merchantKeys, stores,
}: {
  terminalId: string
  initialConfig: FullConfig | null
  currentVersion: number
  terminal: Terminal
  merchantKeys: MerchantKey[]
  stores: Store[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('info')

  // 단말기 정보
  const [name, setName] = useState(terminal.name ?? '')
  const [termId, setTermId] = useState(terminal.term_id ?? '')
  const [terminalType, setTerminalType] = useState<TerminalType>(terminal.terminal_type ?? 'ticket_checker')
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoSuccess, setInfoSuccess] = useState(false)
  const [infoError, setInfoError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // 매장 매핑
  const [selectedStoreId, setSelectedStoreId] = useState(terminal.store_id ?? '')
  // 비플페이 키 연결
  const [selectedKeyId, setSelectedKeyId] = useState(terminal.merchant_key_id ?? '')

  // 기기설정
  const [device, setDevice] = useState<Partial<DeviceConfig>>({
    termId: '', merchantId: '', bizNo: '',
    corner: '', adminPin: '', serialPort: 'COM3',
    offlineMode: false, apiEnv: 'development',
    autoResetTime: '00:00', barcodeReaderType: 'keyboard', barcodePort: 'COM4',
    externalDisplay: false,
    showPaymentList: false, receiptPrint: true, tableCount: 0,
    ...(initialConfig ?? {}),
  })
  const [menus, setMenus] = useState<MenuConfig[]>(initialConfig?.menus ?? [])
  const [generalMenus, setGeneralMenus] = useState<GeneralMenuItem[]>(initialConfig?.generalMenus ?? [])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const d = (k: keyof DeviceConfig, v: string | boolean) => setDevice(prev => ({ ...prev, [k]: v }))

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirm('단말기 정보를 저장하시겠습니까?')) return
    setInfoSaving(true); setInfoError(''); setInfoSuccess(false)
    const [infoRes, keyRes] = await Promise.all([
      fetch(`/api/terminals/${terminal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, term_id: termId.toString().padStart(2, '0'), terminal_type: terminalType, store_id: selectedStoreId || null }),
      }),
      fetch(`/api/terminals/${terminal.id}/key`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantKeyId: selectedKeyId || null }),
      }),
    ])
    setInfoSaving(false)
    if (!infoRes.ok) { const data = await infoRes.json(); setInfoError(data.error ?? '저장 실패') }
    else if (!keyRes.ok) { setInfoError('키 연결 저장 실패') }
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
    if (!confirm('설정을 저장하시겠습니까?')) return
    setSaving(true); setError(''); setSuccess(false)
    const res = await fetch(`/api/terminals/${terminalId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...device, menus, generalMenus }),
    })
    setSaving(false)
    if (!res.ok) { const data = await res.json(); setError(data.error ?? '저장 실패') }
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
  }

  const isTicketChecker = terminalType === 'ticket_checker'
  const menuCount = isTicketChecker ? menus.length : generalMenus.length
  const TABS: [Tab, string][] = [
    ['info', '단말기 정보'],
    ['device', '기기 설정'],
    ['menus', `메뉴 관리 (${menuCount})`],
  ]

  return (
    <div className="glass-card rounded-xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <h2 className="font-semibold text-white text-base">단말기 설정</h2>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {currentVersion > 0 && (
              <p className="text-sm text-white/40">설정 v{currentVersion} — 배포 시 POS가 30초 내 자동 수신</p>
            )}
            {terminal.current_app_version && (
              <span className="text-xs px-2 py-0.5 rounded font-mono"
                style={{ background: 'rgba(96,165,250,0.15)', color: 'rgba(147,197,253,0.8)', border: '1px solid rgba(96,165,250,0.25)' }}>
                앱 v{terminal.current_app_version}
              </span>
            )}
          </div>
        </div>
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
                  <input type="text" value={termId} onChange={e => setTermId(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    maxLength={2} className={inputCls} style={inputStyle} />
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
                  className={inputCls} style={inputStyle} placeholder="1번 단말기 (A코너)" />
              </div>
              <div>
                <label className={labelCls}>소속 매장</label>
                <select value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}
                  className={inputCls} style={{ ...inputStyle, background: 'rgba(255,255,255,0.10)' }}>
                  <option value="" style={{ background: '#0F1B4C' }}>-- 매장 미지정 --</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id} style={{ background: '#0F1B4C' }}>{s.store_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>비플페이 키 연결</label>
                <select value={selectedKeyId} onChange={e => setSelectedKeyId(e.target.value)}
                  className={inputCls} style={{ ...inputStyle, background: 'rgba(255,255,255,0.10)' }}>
                  <option value="" style={{ background: '#0F1B4C' }}>-- 연결 안 함 --</option>
                  {merchantKeys.filter(k => k.is_active).map(k => (
                    <option key={k.id} value={k.id} style={{ background: '#0F1B4C' }}>{k.name} ({k.mid})</option>
                  ))}
                </select>
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
              <label className={labelCls}>관리자 PIN (변경 시만 입력)</label>
              <input type="password" className={inputCls} style={inputStyle} placeholder="변경하지 않으려면 비워두세요" onChange={e => d('adminPin', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>식수 카운트 자동 초기화 시각</label>
              <input type="time" className={inputCls} style={inputStyle} value={device.autoResetTime ?? '00:00'} onChange={e => d('autoResetTime', e.target.value)} />
              <p className="mt-1.5 text-xs text-white/40">매일 이 시각에 식수 카운트가 자동으로 0으로 초기화됩니다</p>
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
            {/* 토글 설정 — 2열 그리드 */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {/* 오프라인 모드 */}
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <span className="text-sm text-white/70">오프라인 모드 강제 활성화</span>
                <button type="button" onClick={() => d('offlineMode', !(device.offlineMode ?? false))}
                  className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ml-2"
                  style={{ background: device.offlineMode ? 'rgba(96,165,250,0.8)' : 'rgba(255,255,255,0.15)' }}>
                  <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: device.offlineMode ? 'translateX(22px)' : 'translateX(4px)' }} />
                </button>
              </div>
            </div>

            {/* 디스플레이 / 출력 설정 */}
            <div className="col-span-2 pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-white/50 mb-3">디스플레이 / 출력</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span className="text-sm text-white/70">외부 디스플레이 (세컨드 모니터)</span>
                  <button type="button" onClick={() => d('externalDisplay', !(device.externalDisplay ?? false))}
                    className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ml-2"
                    style={{ background: device.externalDisplay ? 'rgba(96,165,250,0.8)' : 'rgba(255,255,255,0.15)' }}>
                    <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                      style={{ transform: device.externalDisplay ? 'translateX(22px)' : 'translateX(4px)' }} />
                  </button>
                </div>
                {isTicketChecker && (
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-sm text-white/70">결제 목록 표시 (화면 오른쪽)</span>
                    <button type="button" onClick={() => d('showPaymentList', !(device.showPaymentList ?? false))}
                      className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ml-2"
                      style={{ background: device.showPaymentList ? 'rgba(96,165,250,0.8)' : 'rgba(255,255,255,0.15)' }}>
                      <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                        style={{ transform: device.showPaymentList ? 'translateX(22px)' : 'translateX(4px)' }} />
                    </button>
                  </div>
                )}
                {!isTicketChecker && (
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-sm text-white/70">영수증 출력</span>
                    <button type="button" onClick={() => d('receiptPrint', !(device.receiptPrint ?? true))}
                      className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ml-2"
                      style={{ background: (device.receiptPrint ?? true) ? 'rgba(96,165,250,0.8)' : 'rgba(255,255,255,0.15)' }}>
                      <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                        style={{ transform: (device.receiptPrint ?? true) ? 'translateX(22px)' : 'translateX(4px)' }} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 테이블오더 전용 */}
            {terminalType === 'table_order' && (
              <div className="col-span-2">
                <label className={labelCls}>테이블 수</label>
                <input type="number" className={inputCls} style={inputStyle}
                  value={device.tableCount ?? 0} min={0} max={99}
                  onChange={e => setDevice(prev => ({ ...prev, tableCount: parseInt(e.target.value) || 0 }))} />
              </div>
            )}

            {/* 식권체크기 전용 — 입력 타입별 동작 */}
            {isTicketChecker && (
              <div className="col-span-2 space-y-3 pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white/50">입력 타입별 동작 설정</h3>
                {(['barcode', 'qr', 'rfcard'] as const).map(inputType => (
                  <div key={inputType} className="flex items-center gap-3">
                    <label className="w-20 text-sm text-white/50">
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
                      className={`flex-1 ${inputCls}`} style={inputStyle}
                    >
                      <option value="bizplay_payment" style={{ background: '#0F1B4C' }}>Bizplay 결제</option>
                      <option value="meal_record" style={{ background: '#0F1B4C' }}>식수 기록</option>
                      <option value="disabled" style={{ background: '#0F1B4C' }}>비활성화</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

          <div className="col-span-2 pt-2">
            <button onClick={handleSaveConfig} disabled={saving}
              className="w-full py-3 rounded-lg text-base font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
          </div>
        )}

        {/* 메뉴 관리 탭 — 식권체크기 */}
        {tab === 'menus' && isTicketChecker && (
          <div className="space-y-3">
            {menus.map((menu, i) => (
              <div key={menu.id} className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/50">메뉴 #{i + 1}</span>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => { const u = [...menus]; u[i] = { ...menu, isActive: !menu.isActive }; setMenus(u) }}
                      className="flex items-center gap-2 text-sm text-white/60">
                      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${menu.isActive ? 'bg-green-500' : 'bg-white/20'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${menu.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </span>
                      활성
                    </button>
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
                  <div className="col-span-2">
                    <label className={labelCls}>사운드 파일</label>
                    <input className={inputCls} style={inputStyle} value={menu.soundFile ?? ''} placeholder="success.mp3"
                      onChange={e => { const u = [...menus]; u[i] = { ...menu, soundFile: e.target.value }; setMenus(u) }} />
                  </div>
                </div>

                {/* 서비스 구분코드 (메뉴별) */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <p className="text-sm font-semibold text-white/50">서비스 구분코드</p>
                  {(menu.serviceCodes ?? []).map(sc => (
                    <div key={sc.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <span className="font-mono text-sm text-blue-300 px-2 py-1 rounded w-12 text-center shrink-0" style={{ background: 'rgba(96,165,250,0.20)' }}>{sc.code}</span>
                      {sc.description && <span className="text-sm text-white/60 flex-1">{sc.description}</span>}
                      <span className="text-sm font-semibold text-white">{sc.amount.toLocaleString()}원</span>
                      <button type="button"
                        onClick={() => { const u = [...menus]; u[i] = { ...menu, serviceCodes: (menu.serviceCodes ?? []).filter(x => x.id !== sc.id) }; setMenus(u) }}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors shrink-0">삭제</button>
                    </div>
                  ))}
                  {(menu.serviceCodes ?? []).length === 0 && (
                    <p className="text-xs text-white/30 text-center py-1">등록된 코드 없음</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <input className="w-16 rounded-lg px-3 py-3 text-base font-mono text-white focus:outline-none shrink-0"
                      style={inputStyle} placeholder="코드" maxLength={2}
                      id={`tc-code-${menu.id}`} defaultValue="" />
                    <input className="flex-1 rounded-lg px-4 py-3 text-base text-white focus:outline-none"
                      style={inputStyle} placeholder="설명 (선택)"
                      id={`tc-desc-${menu.id}`} defaultValue="" />
                    <input type="number" className="w-32 rounded-lg px-3 py-3 text-base text-white focus:outline-none shrink-0"
                      style={inputStyle} placeholder="금액 (원)"
                      id={`tc-amt-${menu.id}`} defaultValue="" />
                    <button type="button"
                      onClick={() => {
                        const codeEl = document.getElementById(`tc-code-${menu.id}`) as HTMLInputElement
                        const descEl = document.getElementById(`tc-desc-${menu.id}`) as HTMLInputElement
                        const amtEl = document.getElementById(`tc-amt-${menu.id}`) as HTMLInputElement
                        if (!codeEl?.value) return
                        const u = [...menus]
                        u[i] = { ...menu, serviceCodes: [...(menu.serviceCodes ?? []), { id: crypto.randomUUID(), code: codeEl.value, description: descEl.value || undefined, amount: +amtEl.value || menu.paymentAmount }] }
                        setMenus(u)
                        codeEl.value = ''; descEl.value = ''; amtEl.value = ''
                      }}
                      className="px-5 py-3 rounded-lg text-base font-medium text-white whitespace-nowrap shrink-0"
                      style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}>
                      + 추가
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setMenus([...menus, emptyMenu()])}
              className="w-full py-3 rounded-lg text-base text-white/50 hover:text-white/80 transition-colors"
              style={{ border: '2px dashed rgba(255,255,255,0.15)' }}>
              + 메뉴 추가
            </button>
            <button onClick={handleSaveConfig} disabled={saving}
              className="w-full py-3 rounded-lg text-base font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}

        {/* 메뉴 관리 탭 — POS / KIOSK / 테이블오더 */}
        {tab === 'menus' && !isTicketChecker && (
          <div className="space-y-3">
            {generalMenus.map((menu, i) => (
              <div key={menu.id} className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/50">메뉴 #{i + 1}</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { const u = [...generalMenus]; u[i] = { ...menu, isActive: !menu.isActive }; setGeneralMenus(u) }} className="flex items-center gap-2 text-sm text-white/60">
                      <span className={`w-10 h-5 rounded-full inline-flex relative transition-colors ${menu.isActive ? 'bg-green-500' : 'bg-white/20'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${menu.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </span>
                      활성
                    </button>
                    <button onClick={() => setGeneralMenus(generalMenus.filter((_, j) => j !== i))}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors">삭제</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>메뉴 이름</label>
                    <input className={inputCls} style={inputStyle} value={menu.name} placeholder="아메리카노"
                      onChange={e => { const u = [...generalMenus]; u[i] = { ...menu, name: e.target.value }; setGeneralMenus(u) }} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>가격 (원)</label>
                    <input type="number" className={inputCls} style={inputStyle} value={menu.price}
                      onChange={e => { const u = [...generalMenus]; u[i] = { ...menu, price: parseInt(e.target.value) || 0 }; setGeneralMenus(u) }} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>판매 요일</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {DAY_LABELS.map((day, d) => (
                        <button key={d} type="button"
                          onClick={() => {
                            const u = [...generalMenus]
                            const days = menu.days.includes(d)
                              ? menu.days.filter(x => x !== d)
                              : [...menu.days, d].sort()
                            u[i] = { ...menu, days }
                            setGeneralMenus(u)
                          }}
                          className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            background: menu.days.includes(d) ? 'rgba(96,165,250,0.30)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${menu.days.includes(d) ? 'rgba(96,165,250,0.60)' : 'rgba(255,255,255,0.15)'}`,
                            color: menu.days.includes(d) ? '#93C5FD' : 'rgba(255,255,255,0.40)',
                          }}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 col-span-2">
                    <div className="flex-1">
                      <label className={labelCls}>시작 시각</label>
                      <input type="time" className={inputCls} style={inputStyle} value={menu.startTime}
                        onChange={e => { const u = [...generalMenus]; u[i] = { ...menu, startTime: e.target.value }; setGeneralMenus(u) }} />
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>종료 시각</label>
                      <input type="time" className={inputCls} style={inputStyle} value={menu.endTime}
                        onChange={e => { const u = [...generalMenus]; u[i] = { ...menu, endTime: e.target.value }; setGeneralMenus(u) }} />
                    </div>
                  </div>
                </div>

                {/* 서비스 구분코드 (메뉴별) */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <p className="text-sm font-semibold text-white/50">서비스 구분코드</p>
                  {(menu.serviceCodes ?? []).map(sc => (
                    <div key={sc.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <span className="font-mono text-sm text-blue-300 px-2 py-1 rounded w-12 text-center shrink-0" style={{ background: 'rgba(96,165,250,0.20)' }}>{sc.code}</span>
                      {sc.description && <span className="text-sm text-white/60 flex-1">{sc.description}</span>}
                      <span className="text-sm font-semibold text-white">{sc.amount.toLocaleString()}원</span>
                      <button type="button"
                        onClick={() => {
                          const u = [...generalMenus]
                          u[i] = { ...menu, serviceCodes: (menu.serviceCodes ?? []).filter(x => x.id !== sc.id) }
                          setGeneralMenus(u)
                        }}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors shrink-0">삭제</button>
                    </div>
                  ))}
                  {(menu.serviceCodes ?? []).length === 0 && (
                    <p className="text-xs text-white/30 text-center py-1">등록된 코드 없음</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="w-16 rounded-lg px-3 py-3 text-base font-mono text-white focus:outline-none shrink-0"
                      style={inputStyle} placeholder="코드" maxLength={2}
                      id={`sc-code-${menu.id}`} defaultValue="" />
                    <input
                      className="flex-1 rounded-lg px-4 py-3 text-base text-white focus:outline-none"
                      style={inputStyle} placeholder="설명 (선택)"
                      id={`sc-desc-${menu.id}`} defaultValue="" />
                    <input type="number"
                      className="w-32 rounded-lg px-3 py-3 text-base text-white focus:outline-none shrink-0"
                      style={inputStyle} placeholder="금액 (원)"
                      id={`sc-amt-${menu.id}`} defaultValue="" />
                    <button type="button"
                      onClick={() => {
                        const codeEl = document.getElementById(`sc-code-${menu.id}`) as HTMLInputElement
                        const descEl = document.getElementById(`sc-desc-${menu.id}`) as HTMLInputElement
                        const amtEl = document.getElementById(`sc-amt-${menu.id}`) as HTMLInputElement
                        if (!codeEl?.value) return
                        const u = [...generalMenus]
                        u[i] = { ...menu, serviceCodes: [...(menu.serviceCodes ?? []), { id: crypto.randomUUID(), code: codeEl.value, description: descEl.value || undefined, amount: +amtEl.value || menu.price }] }
                        setGeneralMenus(u)
                        codeEl.value = ''; descEl.value = ''; amtEl.value = ''
                      }}
                      className="px-5 py-3 rounded-lg text-base font-medium text-white whitespace-nowrap shrink-0"
                      style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}>
                      + 추가
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setGeneralMenus([...generalMenus, emptyGeneralMenu()])}
              className="w-full py-3 rounded-lg text-base text-white/50 hover:text-white/80 transition-colors"
              style={{ border: '2px dashed rgba(255,255,255,0.15)' }}>
              + 메뉴 추가
            </button>
            <button onClick={handleSaveConfig} disabled={saving}
              className="w-full py-3 rounded-lg text-base font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
