'use client'
import { useState } from 'react'
import { Lock, CloudOff, Check, AlertCircle } from 'lucide-react'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { useMenuStore } from '@/lib/store/menuStore'

const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'
const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }

const readOnlyCls = 'w-full rounded-lg px-4 py-3 text-base text-white/85 select-all'
const readOnlyStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px dashed rgba(255,255,255,0.14)',
}

interface ReadOnlyFieldProps {
  label: string
  value: string
  mono?: boolean
  mask?: boolean
}

function ReadOnlyField({ label, value, mono, mask }: ReadOnlyFieldProps) {
  const displayValue = mask
    ? value
      ? '•'.repeat(Math.min(value.length, 8))
      : '(설정되지 않음)'
    : value || '(설정되지 않음)'

  return (
    <div>
      <label className="text-base font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-white/40" />
        <span>{label}</span>
        <span className="text-[11px] font-normal text-white/40 ml-1">· 웹 관리자에서 변경</span>
      </label>
      <div
        className={`${readOnlyCls} ${mono ? 'font-mono' : ''}`}
        style={readOnlyStyle}
        title="이 값은 웹 admin에서만 변경할 수 있습니다"
      >
        {displayValue}
      </div>
    </div>
  )
}

interface SyncStatus {
  pending: number
  lastSyncAt: number | null
  lastError: string | null
}

export default function DevicePage() {
  const { config, updateConfig } = useSettingsStore()
  const { serviceCodes, addServiceCode, deleteServiceCode } = useMenuStore()

  // Defensive access — menuStore may not have syncStatus yet (other agent adding it)
  const syncStatus = useMenuStore((s) => (s as unknown as { syncStatus?: SyncStatus }).syncStatus)
  const pending = syncStatus?.pending ?? 0
  const lastSyncAt = syncStatus?.lastSyncAt ?? null
  const lastError = syncStatus?.lastError ?? null

  const handleRetrySync = () => {
    const store = useMenuStore.getState() as unknown as { flushPendingChanges?: () => void }
    store.flushPendingChanges?.()
  }

  const [form, setForm] = useState({ ...config })
  const [saved, setSaved] = useState(false)
  const [newCode, setNewCode] = useState({ code: '', menuName: '', amount: 0 })

  const handleSave = () => {
    // Server-master fields (termId, merchantId, bizNo, adminPin) are NOT overwritten here
    // — they are read-only and must be changed from the web admin.
    const {
      termId: _termId,
      merchantId: _merchantId,
      bizNo: _bizNo,
      adminPin: _adminPin,
      ...localFields
    } = form
    void _termId; void _merchantId; void _bizNo; void _adminPin
    updateConfig(localFields)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddCode = () => {
    if (!newCode.code || !newCode.menuName) return
    addServiceCode(newCode)
    setNewCode({ code: '', menuName: '', amount: 0 })
  }

  // Optional per-item sync status (defensive — may not exist)
  const getItemSyncState = (id: string): 'synced' | 'pending' | 'failed' => {
    const store = useMenuStore.getState() as unknown as {
      serviceCodeSyncState?: Record<string, 'synced' | 'pending' | 'failed'>
    }
    return store.serviceCodeSyncState?.[id] ?? 'synced'
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">단말기 설정</h2>

        {/* 동기화 상태 배지 */}
        <div className="flex items-center gap-2 flex-wrap">
          {pending > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <CloudOff className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-300">대기 중 {pending}건</span>
              <button
                onClick={handleRetrySync}
                className="text-xs text-yellow-200 underline hover:text-yellow-100"
              >
                재시도
              </button>
            </div>
          )}

          {lastError && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-300">동기화 실패: {lastError}</span>
            </div>
          )}

          {pending === 0 && !lastError && lastSyncAt && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-300">동기화됨</span>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 mb-6 space-y-4">
        {/* Read-only server-master fields */}
        <div className="grid grid-cols-2 gap-4">
          <ReadOnlyField label="단말기 ID" value={form.termId} mono />
          <div>
            <label className="text-base font-semibold text-white/60 mb-1.5 block">코너명</label>
            <input
              className={inputCls}
              style={inputStyle}
              value={form.corner}
              onChange={(e) => setForm((f) => ({ ...f, corner: e.target.value }))}
            />
          </div>
        </div>

        <ReadOnlyField label="가맹점코드 (MID)" value={form.merchantId} mono />
        <ReadOnlyField label="사업자번호" value={form.bizNo} mono />
        <ReadOnlyField label="관리자 PIN" value={form.adminPin ?? ''} mask />

        <div>
          <label className="text-base font-semibold text-white/60 mb-2 block">API 환경</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
              <input
                type="radio"
                name="env"
                value="production"
                checked={form.apiEnv === 'production'}
                onChange={() => setForm((f) => ({ ...f, apiEnv: 'production' }))}
              />
              운영 (pgapi.bizplaypay.co.kr)
            </label>
            <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
              <input
                type="radio"
                name="env"
                value="development"
                checked={form.apiEnv === 'development'}
                onChange={() => setForm((f) => ({ ...f, apiEnv: 'development' }))}
              />
              개발 (pgapi-dev.bizplaypay.co.kr)
            </label>
          </div>
        </div>

        <div>
          <label className="text-base font-semibold text-white/60 mb-2 block">바코드 리더 방식</label>
          <div className="flex gap-4 mb-2 flex-wrap">
            {(['keyboard', 'serial', 'camera'] as const).map((val, i) => (
              <label key={val} className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
                <input
                  type="radio"
                  name="barcodeReaderType"
                  value={val}
                  checked={form.barcodeReaderType === val || (!form.barcodeReaderType && val === 'keyboard')}
                  onChange={() => setForm((f) => ({ ...f, barcodeReaderType: val }))}
                />
                {['키보드(HID) 방식', '시리얼(COM) 방식', '카메라(내장) 방식'][i]}
              </label>
            ))}
          </div>
          {form.barcodeReaderType === 'serial' && (
            <div>
              <label className="text-sm text-white/50 mb-1 block">바코드 리더 COM 포트</label>
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="COM4"
                value={form.barcodePort ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, barcodePort: e.target.value }))}
              />
              <p className="text-sm text-white/40 mt-1">Chrome/Edge에서 Web Serial API 지원 (보안 컨텍스트 필요)</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-base font-semibold text-white/60 mb-1.5 block">경광봉 포트</label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="COM3"
              value={form.serialPort}
              onChange={(e) => setForm((f) => ({ ...f, serialPort: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-base font-semibold text-white/60 mb-1.5 block">식수 카운트 자동 초기화 시각</label>
            <input
              type="time"
              className={inputCls}
              style={inputStyle}
              value={form.autoResetTime}
              onChange={(e) => setForm((f) => ({ ...f, autoResetTime: e.target.value }))}
            />
            <p className="mt-1.5 text-xs text-white/40">매일 이 시각에 식수 카운트가 자동으로 0으로 초기화됩니다</p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={form.externalDisplay ?? true}
            onChange={(e) => setForm((f) => ({ ...f, externalDisplay: e.target.checked }))}
          />
          외부 디스플레이 사용
        </label>

        <label className="flex items-center gap-2 text-base text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={form.offlineMode}
            onChange={(e) => setForm((f) => ({ ...f, offlineMode: e.target.checked }))}
          />
          오프라인 모드 강제 활성화
        </label>

        <div className="flex gap-3 pt-2 items-center flex-wrap">
          <button
            onClick={handleSave}
            className={`px-6 py-3 rounded-lg text-base font-semibold text-white transition-all ${saved ? 'glow-green' : ''}`}
            style={
              saved
                ? { background: 'rgba(74,222,128,0.30)', border: '1px solid rgba(74,222,128,0.50)' }
                : { background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }
            }
          >
            {saved ? '✓ 저장됨' : '저장'}
          </button>
          <p className="text-xs text-white/40">
            서버 master 필드(단말기 ID · MID · 사업자번호 · PIN)는 저장되지 않습니다.
          </p>
        </div>
      </div>

      {/* 서비스 구분코드 */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-base font-bold text-white mb-1">서비스 구분코드 설정</h3>
        <p className="text-sm text-white/50 mb-4">바코드 특정 자리 값(2자리)에 따른 차등 가격 운영</p>

        <div className="space-y-2 mb-4">
          {serviceCodes.map((sc) => {
            const state = getItemSyncState(sc.id)
            const dotColor =
              state === 'pending'
                ? 'bg-yellow-400'
                : state === 'failed'
                  ? 'bg-red-400'
                  : 'bg-emerald-400'
            const dotTitle =
              state === 'pending' ? '동기화 대기' : state === 'failed' ? '동기화 실패' : '동기화됨'
            return (
              <div
                key={sc.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <span
                  className={`w-2 h-2 rounded-full ${dotColor}`}
                  title={dotTitle}
                  aria-label={dotTitle}
                />
                <span className="font-mono text-base bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                  {sc.code}
                </span>
                <span className="text-base text-white/80 flex-1">{sc.menuName}</span>
                <span className="text-base font-semibold text-white">{sc.amount.toLocaleString()}원</span>
                <button
                  onClick={() => deleteServiceCode(sc.id)}
                  className="text-red-400 text-sm hover:text-red-300 transition-colors"
                >
                  삭제
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <input
            className="w-20 rounded-lg px-3 py-3 text-base font-mono text-white focus:outline-none"
            style={inputStyle}
            placeholder="코드"
            maxLength={2}
            value={newCode.code}
            onChange={(e) => setNewCode((n) => ({ ...n, code: e.target.value }))}
          />
          <input
            className="flex-1 rounded-lg px-3 py-3 text-base text-white focus:outline-none"
            style={inputStyle}
            placeholder="설명 (선택)"
            value={newCode.menuName}
            onChange={(e) => setNewCode((n) => ({ ...n, menuName: e.target.value }))}
          />
          <input
            type="number"
            className="w-24 rounded-lg px-3 py-3 text-base text-white focus:outline-none"
            style={inputStyle}
            placeholder="금액"
            value={newCode.amount || ''}
            onChange={(e) => setNewCode((n) => ({ ...n, amount: +e.target.value }))}
          />
          <button
            onClick={handleAddCode}
            className="px-4 py-3 rounded-lg text-base font-medium text-white transition-all"
            style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
