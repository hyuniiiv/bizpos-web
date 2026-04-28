'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { useMenuStore } from '@/lib/store/menuStore'
import type { MenuConfig, MealType, PeriodConfig } from '@/types/menu'
import type { Transaction } from '@/types/payment'
import { MenuSettingForm } from '@/components/admin/MenuSettingForm'
import PosMenuSetting from '@/components/admin/PosMenuSetting'
import { SummaryBar } from '@/components/admin/SummaryBar'
import { RealtimeTable } from '@/components/admin/RealtimeTable'
import { TransactionRow } from '@/components/admin/TransactionRow'
import { formatDateTime } from '@/lib/utils'
import { getServerUrl } from '@/lib/serverUrl'
import { createClient } from '@/lib/supabase/client'

type MainTab = 'status' | 'menus' | 'transactions' | 'settings'
type TxView = 'realtime' | 'history'
type PaymentMethodFilter = '전체' | 'QR' | '바코드' | 'RF카드'
type StatusFilter = '전체' | '정상' | '취소' | '오프라인'
type ConnectionStatus = '연결됨' | '연결 끊김' | '재연결 중'

const MEAL_LABELS: Record<MealType, string> = { breakfast: '조식', lunch: '중식', dinner: '석식' }
const SSE_MAX_BACKOFF_MS = 30_000
const SSE_BASE_DELAY_MS = 1_000
const inputCls = 'w-full rounded-lg px-4 py-3 text-base text-white placeholder-white/25 focus:outline-none transition-all'
const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }
const readOnlyCls = 'w-full rounded-lg px-4 py-3 text-base font-mono text-white/50 select-all cursor-text'
const readOnlyStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }

export default function PosAdminPage() {
  const router = useRouter()
  const { config, updateConfig, verifyPin, clearDeviceToken, terminalType, deviceToken, deviceTerminalId } = useSettingsStore()
  const { menus, periods, resetCount, clearAll, addMenu, updateMenu, deleteMenu, setPeriods } = useMenuStore()

  // PIN
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [pinChecking, setPinChecking] = useState(false)

  // Tab
  const [tab, setTab] = useState<MainTab>('status')

  // 현황
  const [confirmReset, setConfirmReset] = useState<string | null>(null)
  const totalCount = menus.reduce((sum, m) => sum + m.count, 0)

  // 메뉴
  const [editingMenu, setEditingMenu] = useState<MenuConfig | null>(null)
  const [menuForm, setMenuForm] = useState<Partial<MenuConfig>>({})
  const [showMenuForm, setShowMenuForm] = useState(false)
  const [editingPeriods, setEditingPeriods] = useState(false)
  const [periodDraft, setPeriodDraft] = useState<PeriodConfig[]>([])

  // 거래
  const [txView, setTxView] = useState<TxView>('realtime')
  const [rtTxs, setRtTxs] = useState<Transaction[]>([])
  const [rtTotalCount, setRtTotalCount] = useState(0)
  const [rtTotalAmount, setRtTotalAmount] = useState(0)
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('재연결 중')
  const [rtPage, setRtPage] = useState(1)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().substring(0, 10))
  const abortRef = useRef<AbortController | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef<number>(SSE_BASE_DELAY_MS)
  const [histTxs, setHistTxs] = useState<Transaction[]>([])
  const [histTotal, setHistTotal] = useState(0)
  const [histTotalAmount, setHistTotalAmount] = useState(0)
  const [histLoading, setHistLoading] = useState(false)
  const [histDates, setHistDates] = useState({ start: new Date().toISOString().substring(0, 10), end: new Date().toISOString().substring(0, 10) })
  const [menuFilter, setMenuFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('전체')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('전체')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 설정
  const [pinInput, setPinInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [offlineMode, setOfflineMode] = useState(config.offlineMode ?? false)

  const handlePinSubmit = async () => {
    if (pinChecking) return
    setPinChecking(true)
    try {
      const ok = await verifyPin(pin)
      if (ok) { setUnlocked(true); setPinError(false) }
      else { setPinError(true); setPin('') }
    } finally { setPinChecking(false) }
  }

  // SSE
  const connectSSE = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setConnStatus('재연결 중')

    const stored = localStorage.getItem('bizpos-settings')
    const token: string | null = stored
      ? (JSON.parse(stored)?.state?.deviceToken ?? null)
      : null

    fetch(getServerUrl() + '/api/transactions/realtime', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`)
        setConnStatus('연결됨')
        retryDelayRef.current = SSE_BASE_DELAY_MS

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'connected') continue
              const tx = data as Transaction
              setRtTxs(prev => [tx, ...prev])
              setRtTotalCount(c => c + 1)
              setRtTotalAmount(a => a + (tx.amount > 0 ? tx.amount : 0))
              setNewIds(ids => new Set([...ids, tx.id]))
              setTimeout(() => setNewIds(ids => { const n = new Set(ids); n.delete(tx.id); return n }), 2000)
            } catch (e) { console.error('[SSE] parse error', e) }
          }
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setConnStatus('연결 끊김')
        const delay = retryDelayRef.current
        retryDelayRef.current = Math.min(delay * 2, SSE_MAX_BACKOFF_MS)
        setConnStatus('재연결 중')
        retryTimerRef.current = setTimeout(connectSSE, delay)
      })
  }, [])

  // 버전 보고 (Electron 전용)
  useEffect(() => {
    if (!deviceToken || !deviceTerminalId) return
    const api = (window as Window & { electronAPI?: { getVersion?: () => Promise<string> } }).electronAPI
    if (!api?.getVersion) return
    api.getVersion().then((version) => {
      fetch(getServerUrl() + '/api/terminal/report-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken}` },
        body: JSON.stringify({ version }),
      }).catch(() => {})
    })
  }, [deviceToken, deviceTerminalId])

  // Supabase Realtime: 업데이트 지시 수신
  useEffect(() => {
    if (!deviceTerminalId) return
    const supabase = createClient()
    const channel = supabase
      .channel('terminal-update-cmd')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'terminals',
        filter: `id=eq.${deviceTerminalId}`,
      }, (payload) => {
        const newVal = (payload.new as { update_requested_at?: string }).update_requested_at
        const oldVal = (payload.old as { update_requested_at?: string }).update_requested_at
        if (newVal && newVal !== oldVal) {
          ;(window as Window & { electronAPI?: { checkUpdate?: () => void } }).electronAPI?.checkUpdate?.()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [deviceTerminalId])

  useEffect(() => {
    if (!unlocked || tab !== 'transactions' || txView !== 'realtime') return
    connectSSE()
    loadRtTxs(selectedDate)
    return () => { abortRef.current?.abort(); if (retryTimerRef.current) clearTimeout(retryTimerRef.current) }
  }, [unlocked, tab, txView, connectSSE])

  const loadRtTxs = async (date: string, page = 1) => {
    try {
      const res = await fetch(getServerUrl() + `/api/transactions?date=${date}&limit=20&offset=${(page - 1) * 20}`, { headers: { 'Authorization': `Bearer ${deviceToken ?? ''}` } })
      const d = await res.json()
      setRtTxs(d.items ?? []); setRtTotalCount(d.total ?? 0); setRtTotalAmount(d.totalAmount ?? 0)
    } catch {}
  }

  const loadHistTxs = useCallback(async () => {
    setHistLoading(true); setSelectedIds(new Set())
    try {
      const res = await fetch(getServerUrl() + `/api/transactions?dateStart=${histDates.start}&dateEnd=${histDates.end}&limit=200`, { headers: { 'Authorization': `Bearer ${deviceToken ?? ''}` } })
      const d = await res.json()
      setHistTxs(d.items ?? []); setHistTotal(d.total ?? 0); setHistTotalAmount(d.totalAmount ?? 0)
    } finally { setHistLoading(false) }
  }, [histDates.start, histDates.end])

  useEffect(() => {
    if (unlocked && tab === 'transactions' && txView === 'history') loadHistTxs()
  }, [unlocked, tab, txView, loadHistTxs])

  const menuNames = useMemo(() => Array.from(new Set(histTxs.map(t => t.menuName).filter(Boolean))).sort(), [histTxs])
  const filteredTxs = useMemo(() => histTxs.filter(tx => {
    if (menuFilter && tx.menuName !== menuFilter) return false
    if (methodFilter !== '전체') { const m: Record<PaymentMethodFilter, string> = { '전체': '', 'QR': 'qr', '바코드': 'barcode', 'RF카드': 'rfcard' }; if (tx.paymentType !== m[methodFilter]) return false }
    if (statusFilter !== '전체') { const s: Record<StatusFilter, string> = { '전체': '', '정상': 'success', '취소': 'cancelled', '오프라인': 'pending_offline' }; if (tx.status !== s[statusFilter]) return false }
    return true
  }), [histTxs, menuFilter, methodFilter, statusFilter])

  const cancelable = useMemo(() => filteredTxs.filter(t => t.status === 'success'), [filteredTxs])
  const allSelected = cancelable.length > 0 && cancelable.every(t => selectedIds.has(t.id))

  const handleCancel = async (tx: Transaction) => {
    if (!confirm(`거래번호 ${tx.merchantOrderID} 를 취소하시겠습니까?`)) return
    const res = await fetch(getServerUrl() + '/api/payment/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken ?? ''}` }, body: JSON.stringify({ merchantOrderDt: tx.merchantOrderID.substring(0, 8), merchantOrderID: tx.merchantOrderID, tid: tx.tid, totalAmount: tx.amount, menuName: tx.menuName, termId: tx.termId }) }).then(r => r.json())
    if (res.code === '0000') { alert('취소 완료'); loadHistTxs() } else alert(`취소 실패: ${res.msg}`)
  }

  const handleBatchCancel = async () => {
    const targets = filteredTxs.filter(tx => selectedIds.has(tx.id))
    if (!targets.length || !confirm(`선택한 ${targets.length}건을 일괄 취소하시겠습니까?`)) return
    let failed = 0
    for (const tx of targets) {
      try {
        const res = await fetch(getServerUrl() + '/api/payment/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken ?? ''}` }, body: JSON.stringify({ merchantOrderDt: tx.merchantOrderID.substring(0, 8), merchantOrderID: tx.merchantOrderID, tid: tx.tid, totalAmount: tx.amount, menuName: tx.menuName, termId: tx.termId }) }).then(r => r.json())
        if (res.code !== '0000') failed++
      } catch { failed++ }
    }
    alert(failed === 0 ? `${targets.length}건 취소 완료` : `${targets.length - failed}건 성공, ${failed}건 실패`)
    loadHistTxs()
  }

  const exportCSV = () => {
    const rows = filteredTxs.map(tx => [formatDateTime(tx.approvedAt), tx.userName || '', tx.menuName, tx.amount, tx.paymentType === 'qr' ? 'QR' : tx.paymentType === 'rfcard' ? 'RF카드' : '바코드', tx.status === 'success' ? '정상' : tx.status === 'cancelled' ? '취소' : '오프라인'])
    const csv = [['사용일시', '사용자명', '과정명', '사용금액', '결제방식', '상태'], ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })); a.download = `transactions_${histDates.start}.csv`; a.click()
  }

  const handleToggleOffline = async (v: boolean) => {
    setOfflineMode(v)
    await updateConfig({ ...config, offlineMode: v })
    if (deviceToken && deviceToken !== 'manual') {
      await fetch(getServerUrl() + '/api/device/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken}` },
        body: JSON.stringify({ ...config, offlineMode: v }),
      })
    }
  }

  const handleSavePin = async () => {
    if (!pinInput) return
    await updateConfig({ ...config, adminPin: pinInput })
    if (deviceToken && deviceToken !== 'manual') {
      await fetch(getServerUrl() + '/api/device/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken}` },
        body: JSON.stringify({ ...config, adminPin: pinInput }),
      })
    }
    setPinInput(''); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const syncMenusToServer = useCallback(() => {
    if (!deviceToken || deviceToken === 'manual') return
    const { menus: m, periods: p, serviceCodes: s } = useMenuStore.getState()
    fetch(getServerUrl() + '/api/device/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken}` },
      body: JSON.stringify({ ...config, menus: m, periods: p, serviceCodes: s }),
    }).catch(() => {})
  }, [deviceToken, config])

  const openAddMenu = () => { setEditingMenu(null); setMenuForm({ mealType: 'lunch', name: '', displayAmount: 8000, paymentAmount: 8000, startTime: '11:30', endTime: '13:00', soundFile: 'success.mp3', isActive: true }); setShowMenuForm(true) }
  const openEditMenu = (m: MenuConfig) => { setEditingMenu(m); setMenuForm({ ...m }); setShowMenuForm(true) }
  const handleMenuSave = () => {
    if (!menuForm.name || !menuForm.startTime || !menuForm.endTime) return
    if (editingMenu) updateMenu(editingMenu.id, menuForm); else addMenu(menuForm as Omit<MenuConfig, 'id' | 'count'>)
    setShowMenuForm(false); setMenuForm({})
    syncMenusToServer()
  }

  const groupedMenus = (Object.keys(MEAL_LABELS) as MealType[]).map(mt => ({ mealType: mt, label: MEAL_LABELS[mt], menus: menus.filter(m => m.mealType === mt) }))

  // PIN gate
  if (!unlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="glass-strong rounded-2xl p-8 w-full max-w-xs text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-lg font-bold text-white mb-1">관리자 설정</h2>
          <p className="text-sm text-white/45 mb-5">관리자 PIN을 입력하세요</p>
          <input type="password"
            className="w-full rounded-xl px-4 py-3 text-center text-2xl tracking-widest mb-3 focus:outline-none text-white placeholder-white/25"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)' }}
            maxLength={6} value={pin} onChange={e => { setPin(e.target.value); setPinError(false) }}
            onKeyDown={e => e.key === 'Enter' && handlePinSubmit()} autoFocus placeholder="••••" />
          {pinError && <p className="text-red-400 text-sm mb-3">PIN이 올바르지 않습니다</p>}
          <button onClick={handlePinSubmit} disabled={pinChecking}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
            {pinChecking ? '확인 중...' : '확인'}
          </button>
          <button onClick={() => router.back()} className="mt-3 w-full py-3 rounded-xl text-base text-white/50 hover:text-white/80 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>취소</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/10" style={{ background: 'rgba(5,14,31,0.60)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.back()} className="text-white/60 text-base hover:text-white transition-colors">← 돌아가기</button>
        <h1 className="text-white font-bold text-lg">POS 관리자</h1>
        <div className="w-20" />
      </div>

      <div className="flex border-b border-white/10 overflow-x-auto" style={{ background: 'rgba(5,14,31,0.40)', backdropFilter: 'blur(8px)' }}>
        {([['status', '현황'], ['menus', '메뉴'], ['transactions', '거래'], ['settings', '설정']] as [MainTab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-[72px] py-3 text-base font-medium transition-colors whitespace-nowrap ${tab === t ? 'text-blue-300 border-b-2 border-blue-400' : 'text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* 현황 */}
        {tab === 'status' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 text-center glow-blue">
              <p className="text-white/60 text-sm mb-1">오늘 총 식수</p>
              <p className="text-5xl font-black text-white">{totalCount.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10"><p className="text-base font-semibold text-white/80">메뉴별 현황</p></div>
              {menus.length === 0 ? <p className="px-4 py-8 text-center text-white/40">설정된 메뉴가 없습니다</p> : (
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10"><tr>
                    <th className="px-4 py-3 text-left text-white/50">구분</th>
                    <th className="px-4 py-3 text-left text-white/50">메뉴명</th>
                    <th className="px-4 py-3 text-right text-white/50">카운트</th>
                    <th className="px-4 py-3 text-center text-white/50">초기화</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {menus.map(m => (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3"><span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{MEAL_LABELS[m.mealType]}</span></td>
                        <td className="px-4 py-3 font-medium text-white">{m.name}<p className="text-xs text-white/40">{m.startTime}~{m.endTime}</p></td>
                        <td className="px-4 py-3 text-right font-black text-2xl text-white">{m.count}</td>
                        <td className="px-4 py-3 text-center"><button onClick={() => setConfirmReset(m.id)} className="text-sm text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors">초기화</button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}><tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-white/70">합계</td>
                    <td className="px-4 py-3 text-right font-black text-2xl text-white">{totalCount}</td><td />
                  </tr></tfoot>
                </table>
              )}
            </div>
            <button onClick={() => setConfirmReset('all')} className="w-full py-3 rounded-xl font-semibold text-white transition-all glow-red" style={{ background: 'rgba(239,68,68,0.30)', border: '1px solid rgba(239,68,68,0.50)' }}>전체 식수 초기화</button>
            {confirmReset !== null && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="glass-strong rounded-2xl p-6 w-80 text-center">
                  <p className="font-semibold text-white mb-2">카운트를 초기화하시겠습니까?</p>
                  <p className="text-sm text-white/60 mb-5">{confirmReset === 'all' ? '전체 메뉴의 카운트가 0으로 초기화됩니다.' : '선택한 메뉴의 카운트가 0으로 초기화됩니다.'}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmReset(null)} className="flex-1 py-3 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.18)' }}>취소</button>
                    <button onClick={() => { resetCount(confirmReset === 'all' ? undefined : confirmReset); setConfirmReset(null) }} className="flex-1 py-3 rounded-lg text-sm font-semibold text-white transition-all" style={{ background: 'rgba(239,68,68,0.35)', border: '1px solid rgba(239,68,68,0.55)' }}>초기화</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 메뉴 */}
        {tab === 'menus' && terminalType !== 'ticket_checker' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">메뉴 설정</h2>
            <PosMenuSetting />
          </div>
        )}

        {tab === 'menus' && terminalType === 'ticket_checker' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">메뉴 설정</h2>
              <button onClick={openAddMenu} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}>+ 메뉴 추가</button>
            </div>
            <div className="glass-card rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white/80">식사시간대 기본 설정</h3>
                {!editingPeriods
                  ? <button onClick={() => { setPeriodDraft([...periods]); setEditingPeriods(true) }} className="text-sm text-blue-400 hover:text-blue-300">수정</button>
                  : <div className="flex gap-3"><button onClick={() => setEditingPeriods(false)} className="text-sm text-white/50">취소</button><button onClick={() => { setPeriods(periodDraft); setEditingPeriods(false); syncMenusToServer() }} className="text-sm text-blue-400 font-semibold">저장</button></div>
                }
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(MEAL_LABELS) as MealType[]).map(mt => {
                  const p = (editingPeriods ? periodDraft : periods).find(x => x.mealType === mt)
                  return (
                    <div key={mt} className="space-y-1">
                      <p className="text-sm font-semibold text-white/50">{MEAL_LABELS[mt]}</p>
                      {editingPeriods && p ? (
                        <div className="flex items-center gap-1">
                          <input type="time" value={p.startTime} onChange={e => setPeriodDraft(d => d.map(x => x.mealType === mt ? { ...x, startTime: e.target.value } : x))} className="rounded px-2 py-1.5 text-xs w-full text-white focus:outline-none" style={inputStyle} />
                          <span className="text-white/40 text-xs">~</span>
                          <input type="time" value={p.endTime} onChange={e => setPeriodDraft(d => d.map(x => x.mealType === mt ? { ...x, endTime: e.target.value } : x))} className="rounded px-2 py-1.5 text-xs w-full text-white focus:outline-none" style={inputStyle} />
                        </div>
                      ) : <p className="text-sm text-white font-mono">{p ? `${p.startTime}~${p.endTime}` : '미설정'}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
            {groupedMenus.map(({ mealType, label, menus: mealMenus }) => (
              <div key={mealType} className="mb-4">
                <h3 className="text-sm font-semibold text-white/50 mb-2">{label}</h3>
                <div className="glass-card rounded-xl overflow-hidden">
                  {mealMenus.length === 0 ? <p className="px-4 py-5 text-center text-white/40 text-sm">메뉴가 없습니다</p> : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}><tr>
                        <th className="px-4 py-3 text-left text-white/50">메뉴명</th>
                        <th className="px-4 py-3 text-right text-white/50">화면금액</th>
                        <th className="px-4 py-3 text-right text-white/50">결제금액</th>
                        <th className="px-4 py-3 text-center text-white/50">판매시간</th>
                        <th className="px-4 py-3 text-center text-white/50">활성</th>
                        <th className="px-4 py-3 text-center text-white/50">관리</th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/5">
                        {mealMenus.map(m => (
                          <tr key={m.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-medium text-white">{m.name}</td>
                            <td className="px-4 py-3 text-right text-white/80">{m.displayAmount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-white/80">{m.paymentAmount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center text-white/60">{m.startTime}~{m.endTime}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => { updateMenu(m.id, { isActive: !m.isActive }); syncMenusToServer() }}>
                                <span className={`w-10 h-5 rounded-full inline-flex relative transition-colors ${m.isActive ? 'bg-green-500' : 'bg-white/20'}`}>
                                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${m.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center space-x-2">
                              <button onClick={() => openEditMenu(m)} className="text-blue-400 hover:text-blue-300 text-xs">수정</button>
                              <button onClick={() => { deleteMenu(m.id); syncMenusToServer() }} className="text-red-400 hover:text-red-300 text-xs">삭제</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
            {showMenuForm && <MenuSettingForm editing={editingMenu} form={menuForm} onChange={u => setMenuForm(f => ({ ...f, ...u }))} onSave={handleMenuSave} onClose={() => { setShowMenuForm(false); setMenuForm({}) }} />}
          </div>
        )}

        {/* 거래 */}
        {tab === 'transactions' && (
          <div>
            <div className="flex gap-1 p-1 rounded-lg w-fit mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {(['realtime', 'history'] as TxView[]).map(v => (
                <button key={v} onClick={() => setTxView(v)} className="px-4 py-1.5 rounded text-sm font-medium transition-all"
                  style={txView === v ? { background: 'rgba(96,165,250,0.30)', color: 'rgb(147,197,253)' } : { color: 'rgba(255,255,255,0.45)' }}>
                  {v === 'realtime' ? '실시간' : '내역'}
                </button>
              ))}
            </div>

            {txView === 'realtime' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">실시간 거래관리</h2>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connStatus === '연결됨' ? 'bg-green-400 animate-pulse' : connStatus === '재연결 중' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-sm font-medium ${connStatus === '연결됨' ? 'text-green-400' : connStatus === '재연결 중' ? 'text-yellow-400' : 'text-red-400'}`}>{connStatus}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); loadRtTxs(e.target.value) }} className="rounded-lg px-4 py-3 text-base text-white focus:outline-none" style={inputStyle} />
                  <button onClick={() => loadRtTxs(selectedDate)} className="px-4 py-3 rounded-lg text-base font-medium text-white" style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}>새로고침</button>
                </div>
                <SummaryBar totalCount={rtTotalCount} totalAmount={rtTotalAmount} />
                <RealtimeTable transactions={rtTxs} newIds={newIds} totalCount={rtTotalCount} totalAmount={rtTotalAmount} page={rtPage} pageSize={20} onPageChange={p => { setRtPage(p); loadRtTxs(selectedDate, p) }} />
              </div>
            )}

            {txView === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">거래내역 조회</h2>
                  <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && <button onClick={handleBatchCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'rgba(239,68,68,0.30)', border: '1px solid rgba(239,68,68,0.50)' }}>선택 취소 ({selectedIds.size}건)</button>}
                    <button onClick={exportCSV} className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-colors" style={{ border: '1px solid rgba(255,255,255,0.18)' }}>CSV</button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <input type="date" className="rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none" style={inputStyle} value={histDates.start} onChange={e => setHistDates(d => ({ ...d, start: e.target.value }))} />
                  <span className="text-white/40">~</span>
                  <input type="date" className="rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none" style={inputStyle} value={histDates.end} onChange={e => setHistDates(d => ({ ...d, end: e.target.value }))} />
                  <button onClick={loadHistTxs} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.40)' }}>조회</button>
                </div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <select value={menuFilter} onChange={e => setMenuFilter(e.target.value)} className="rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none" style={inputStyle}>
                    <option value="" style={{ background: '#0F1B4C' }}>메뉴 전체</option>
                    {menuNames.map(n => <option key={n} value={n} style={{ background: '#0F1B4C' }}>{n}</option>)}
                  </select>
                  <select value={methodFilter} onChange={e => setMethodFilter(e.target.value as PaymentMethodFilter)} className="rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none" style={inputStyle}>
                    {(['전체', 'QR', '바코드', 'RF카드'] as PaymentMethodFilter[]).map(v => <option key={v} value={v} style={{ background: '#0F1B4C' }}>{v === '전체' ? '결제수단 전체' : v}</option>)}
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none" style={inputStyle}>
                    {(['전체', '정상', '취소', '오프라인'] as StatusFilter[]).map(v => <option key={v} value={v} style={{ background: '#0F1B4C' }}>{v === '전체' ? '상태 전체' : v}</option>)}
                  </select>
                  {(menuFilter || methodFilter !== '전체' || statusFilter !== '전체') && <button onClick={() => { setMenuFilter(''); setMethodFilter('전체'); setStatusFilter('전체') }} className="px-4 py-2.5 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.18)' }}>필터 초기화</button>}
                </div>
                <div className="flex gap-4 mb-4 text-sm">
                  <span className="font-semibold text-white/80">{filteredTxs.length !== histTxs.length ? `${filteredTxs.length}건 (전체 ${histTotal}건)` : `총 ${histTotal}건`}</span>
                  <span className="text-white/30">|</span>
                  <span className="font-semibold text-white/80">합계 {histTotalAmount.toLocaleString()}원</span>
                </div>
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}><tr>
                        <th className="px-4 py-3 text-center w-10"><input type="checkbox" checked={allSelected} onChange={e => setSelectedIds(e.target.checked ? new Set(cancelable.map(t => t.id)) : new Set())} /></th>
                        <th className="px-4 py-3 text-left text-xs text-white/50">사용일시</th>
                        <th className="px-4 py-3 text-left text-xs text-white/50">사용자명</th>
                        <th className="px-4 py-3 text-left text-xs text-white/50">과정명</th>
                        <th className="px-4 py-3 text-right text-xs text-white/50">사용금액</th>
                        <th className="px-4 py-3 text-center text-xs text-white/50">결제방식</th>
                        <th className="px-4 py-3 text-center text-xs text-white/50">상태</th>
                        <th className="px-4 py-3 text-center text-xs text-white/50">관리</th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/5">
                        {histLoading ? <tr><td colSpan={8} className="py-12 text-center text-white/40">로딩 중...</td></tr>
                          : filteredTxs.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-white/40">조회된 내역이 없습니다</td></tr>
                          : filteredTxs.map(tx => <TransactionRow key={tx.id} tx={tx} selected={selectedIds.has(tx.id)} onSelect={(id, checked) => setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })} onCancel={handleCancel} />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 설정 */}
        {tab === 'settings' && (
          <div className="space-y-6">

            {/* 일반 설정 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest px-1">일반 설정</p>

              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">비상 모드</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base text-white">오프라인 모드 강제 활성화</p>
                    <p className="text-xs text-white/40 mt-0.5">네트워크 없이 로컬에서만 운영</p>
                  </div>
                  <button type="button" onClick={() => handleToggleOffline(!offlineMode)}
                    className={`relative w-11 h-6 rounded-full transition-colors ml-4 ${offlineMode ? 'bg-orange-500' : 'bg-white/20'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${offlineMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {offlineMode && (
                  <p className="text-xs text-orange-400 font-medium">⚠ 오프라인 모드 활성화 중 — 거래가 로컬에 저장됩니다</p>
                )}
              </div>

              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">관리자 PIN 변경</h3>
                <input type="password" className={inputCls} style={inputStyle}
                  value={pinInput} placeholder="새 PIN 입력 (4~6자리)" maxLength={6}
                  onChange={e => setPinInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSavePin()} />
                <button onClick={handleSavePin} disabled={!pinInput}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40"
                  style={saved
                    ? { background: 'rgba(74,222,128,0.30)', border: '1px solid rgba(74,222,128,0.50)' }
                    : { background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
                  {saved ? '✓ 변경 완료' : 'PIN 변경'}
                </button>
              </div>
            </div>

            {/* 시스템 (Electron 전용) */}
            {typeof window !== 'undefined' && (window as Window & { electronAPI?: { quitApp?: () => void; checkUpdate?: () => void } }).electronAPI && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-white/30 uppercase tracking-widest px-1">시스템</p>
                <UpdateButton />
                <LogButton />
              </div>
            )}

            {/* 위험 작업 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest px-1">위험 작업</p>

              <div className="glass-card rounded-xl p-4 space-y-2" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                <h3 className="text-sm font-semibold text-red-400">단말기 초기화</h3>
                <p className="text-xs text-white/40">활성화 토큰과 메뉴·설정 데이터를 모두 삭제합니다. 초기화 후 다시 활성화 코드를 입력해야 합니다.</p>
                <button onClick={() => { if (!confirm('단말기를 초기화하시겠습니까?\n활성화 토큰과 모든 로컬 데이터가 삭제됩니다.')) return; clearAll(); clearDeviceToken(); router.replace('/pos') }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-red-300 transition-all hover:bg-red-500/10" style={{ border: '1px solid rgba(239,68,68,0.40)' }}>
                  단말기 초기화
                </button>
              </div>

              {typeof window !== 'undefined' && (window as Window & { electronAPI?: { quitApp?: () => void } }).electronAPI && (
                <div className="glass-card rounded-xl p-4 space-y-2" style={{ border: '1px solid rgba(239,68,68,0.40)' }}>
                  <h3 className="text-sm font-semibold text-red-300">프로그램 종료</h3>
                  <p className="text-xs text-white/40">BIZPOS 애플리케이션을 완전히 종료합니다.</p>
                  <button
                    onClick={() => { if (!confirm('프로그램을 종료하시겠습니까?')) return; (window as Window & { electronAPI?: { quitApp?: () => void } }).electronAPI?.quitApp?.() }}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                    style={{ background: 'rgba(239,68,68,0.35)', border: '1px solid rgba(239,68,68,0.55)' }}>
                    프로그램 종료
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

type ElectronAPI = {
  checkUpdate?: () => void
  onNoUpdate?: (cb: () => void) => () => void
}

function LogButton() {
  const handleClick = () => {
    const api = (window as Window & { electronAPI?: { openLogs?: () => void } }).electronAPI
    api?.openLogs?.()
  }
  return (
    <div className="glass-card rounded-xl p-4 space-y-2" style={{ border: '1px solid rgba(148,163,184,0.30)' }}>
      <p className="text-sm font-semibold text-slate-300">로그</p>
      <p className="text-xs text-white/40">BIZPOS 실행 로그 폴더를 엽니다.</p>
      <button
        onClick={handleClick}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
        style={{ background: 'rgba(148,163,184,0.25)', border: '1px solid rgba(148,163,184,0.45)' }}>
        로그 폴더 열기
      </button>
    </div>
  )
}

function UpdateButton() {
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<'idle' | 'latest'>('idle')
  const api = typeof window !== 'undefined' ? (window as Window & { electronAPI?: ElectronAPI }).electronAPI : undefined

  useEffect(() => {
    if (!api?.onNoUpdate) return
    const unsub = api.onNoUpdate(() => {
      setChecking(false)
      setStatus('latest')
      setTimeout(() => setStatus('idle'), 3000)
    })
    return unsub
  }, [])

  const handleCheck = () => {
    setChecking(true)
    setStatus('idle')
    api?.checkUpdate?.()
  }

  return (
    <div className="glass-card rounded-xl p-4 space-y-2" style={{ border: '1px solid rgba(96,165,250,0.35)' }}>
      <p className="text-sm font-semibold text-blue-300">업데이트</p>
      <p className="text-xs text-white/40">
        {status === 'latest' ? '✓ 최신 버전입니다.' : '새 버전이 있으면 다운로드 안내가 표시됩니다.'}
      </p>
      <button
        onClick={handleCheck}
        disabled={checking}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: 'rgba(96,165,250,0.25)', border: '1px solid rgba(96,165,250,0.45)' }}>
        {checking ? '확인 중...' : '업데이트 확인'}
      </button>
    </div>
  )
}
