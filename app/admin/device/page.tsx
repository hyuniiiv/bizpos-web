'use client'
import { useState } from 'react'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { useMenuStore } from '@/lib/store/menuStore'
import type { ServiceCodeConfig } from '@/types/menu'

const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'
const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }

export default function DevicePage() {
  const { config, updateConfig } = useSettingsStore()
  const { serviceCodes, addServiceCode, deleteServiceCode } = useMenuStore()
  const [form, setForm] = useState({ ...config })
  const [pinInput, setPinInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [newCode, setNewCode] = useState({ code: '', menuName: '', amount: 0 })

  const handleSave = () => {
    const configToSave = pinInput ? { ...form, adminPin: pinInput } : form
    updateConfig(configToSave)
    setPinInput('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddCode = () => {
    if (!newCode.code || !newCode.menuName) return
    addServiceCode(newCode)
    setNewCode({ code: '', menuName: '', amount: 0 })
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-6">단말기 설정</h2>

      <div className="glass-card rounded-xl p-6 mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-base font-semibold text-white/60 mb-1.5 block">단말기 ID (2자리)</label>
            <input className={inputCls} style={inputStyle}
              maxLength={2} value={form.termId}
              onChange={e => setForm(f => ({ ...f, termId: e.target.value }))} />
          </div>
          <div>
            <label className="text-base font-semibold text-white/60 mb-1.5 block">코너명</label>
            <input className={inputCls} style={inputStyle}
              value={form.corner} onChange={e => setForm(f => ({ ...f, corner: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="text-base font-semibold text-white/60 mb-1.5 block">가맹점코드 (MID, 12자리)</label>
          <input className={`${inputCls} font-mono`} style={inputStyle}
            value={form.merchantId} onChange={e => setForm(f => ({ ...f, merchantId: e.target.value }))} />
        </div>

        <div>
          <label className="text-base font-semibold text-white/60 mb-1.5 block">사업자번호</label>
          <input className={`${inputCls} font-mono`} style={inputStyle}
            value={form.bizNo} onChange={e => setForm(f => ({ ...f, bizNo: e.target.value }))} />
        </div>

        <div>
          <label className="text-base font-semibold text-white/60 mb-1.5 block">관리자 PIN</label>
          <input type="password" className={inputCls} style={inputStyle}
            value={pinInput} placeholder="변경하려면 새 PIN 입력"
            onChange={e => setPinInput(e.target.value)} />
        </div>

        <div>
          <label className="text-base font-semibold text-white/60 mb-2 block">API 환경</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
              <input type="radio" name="env" value="production"
                checked={form.apiEnv === 'production'}
                onChange={() => setForm(f => ({ ...f, apiEnv: 'production' }))} />
              운영 (pgapi.bizplaypay.co.kr)
            </label>
            <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
              <input type="radio" name="env" value="development"
                checked={form.apiEnv === 'development'}
                onChange={() => setForm(f => ({ ...f, apiEnv: 'development' }))} />
              개발 (pgapi-dev.bizplaypay.co.kr)
            </label>
          </div>
        </div>

        <div>
          <label className="text-base font-semibold text-white/60 mb-2 block">바코드 리더 방식</label>
          <div className="flex gap-4 mb-2 flex-wrap">
            {(['keyboard', 'serial', 'camera'] as const).map((val, i) => (
              <label key={val} className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
                <input type="radio" name="barcodeReaderType" value={val}
                  checked={form.barcodeReaderType === val || (!form.barcodeReaderType && val === 'keyboard')}
                  onChange={() => setForm(f => ({ ...f, barcodeReaderType: val }))} />
                {['키보드(HID) 방식', '시리얼(COM) 방식', '카메라(내장) 방식'][i]}
              </label>
            ))}
          </div>
          {form.barcodeReaderType === 'serial' && (
            <div>
              <label className="text-sm text-white/50 mb-1 block">바코드 리더 COM 포트</label>
              <input className={inputCls} style={inputStyle}
                placeholder="COM4" value={form.barcodePort ?? ''}
                onChange={e => setForm(f => ({ ...f, barcodePort: e.target.value }))} />
              <p className="text-sm text-white/40 mt-1">Chrome/Edge에서 Web Serial API 지원 (보안 컨텍스트 필요)</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-base font-semibold text-white/60 mb-1.5 block">경광봉 포트</label>
            <input className={inputCls} style={inputStyle}
              placeholder="COM3" value={form.serialPort}
              onChange={e => setForm(f => ({ ...f, serialPort: e.target.value }))} />
          </div>
          <div>
            <label className="text-base font-semibold text-white/60 mb-1.5 block">자동 초기화 시간</label>
            <input type="time" className={inputCls} style={inputStyle}
              value={form.autoResetTime}
              onChange={e => setForm(f => ({ ...f, autoResetTime: e.target.value }))} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
          <input type="checkbox" checked={form.externalDisplay ?? true}
            onChange={e => setForm(f => ({ ...f, externalDisplay: e.target.checked }))} />
          외부 디스플레이 사용
        </label>

        <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
          <input type="checkbox" checked={form.offlineMode}
            onChange={e => setForm(f => ({ ...f, offlineMode: e.target.checked }))} />
          오프라인 모드 강제 활성화
        </label>

        <label className="flex items-center gap-2 text-base cursor-pointer"
               style={{ color: form.cafeteriaMode ? '#06D6A0' : 'rgba(255,255,255,0.70)' }}>
          <input type="checkbox" checked={form.cafeteriaMode ?? false}
            onChange={e => setForm(f => ({ ...f, cafeteriaMode: e.target.checked }))} />
          학생식당 모드 (판매현황 동시 표시)
        </label>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave}
            className={`px-6 py-3 rounded-lg text-base font-semibold text-white transition-all ${saved ? 'glow-green' : ''}`}
            style={saved
              ? { background: 'rgba(74,222,128,0.30)', border: '1px solid rgba(74,222,128,0.50)' }
              : { background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }
            }>
            {saved ? '✓ 저장됨' : '저장'}
          </button>
        </div>
      </div>

      {/* 서비스 구분코드 */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-base font-bold text-white mb-1">서비스 구분코드 설정</h3>
        <p className="text-sm text-white/50 mb-4">바코드 특정 자리 값(2자리)에 따른 차등 가격 운영</p>

        <div className="space-y-2 mb-4">
          {serviceCodes.map(sc => (
            <div key={sc.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <span className="font-mono text-base bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">{sc.code}</span>
              <span className="text-base text-white/80 flex-1">{sc.menuName}</span>
              <span className="text-base font-semibold text-white">{sc.amount.toLocaleString()}원</span>
              <button onClick={() => deleteServiceCode(sc.id)} className="text-red-400 text-sm hover:text-red-300 transition-colors">삭제</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input className="w-20 rounded-lg px-3 py-3 text-base font-mono text-white focus:outline-none"
            style={inputStyle} placeholder="코드" maxLength={2} value={newCode.code}
            onChange={e => setNewCode(n => ({ ...n, code: e.target.value }))} />
          <input className="flex-1 rounded-lg px-3 py-3 text-base text-white focus:outline-none"
            style={inputStyle} placeholder="메뉴명" value={newCode.menuName}
            onChange={e => setNewCode(n => ({ ...n, menuName: e.target.value }))} />
          <input type="number" className="w-24 rounded-lg px-3 py-3 text-base text-white focus:outline-none"
            style={inputStyle} placeholder="금액" value={newCode.amount || ''}
            onChange={e => setNewCode(n => ({ ...n, amount: +e.target.value }))} />
          <button onClick={handleAddCode}
            className="px-4 py-3 rounded-lg text-base font-medium text-white transition-all"
            style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}>
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
