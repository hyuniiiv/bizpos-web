'use client'
import { useEffect, useCallback, useRef, useState } from 'react'
import { useMenuStore } from '@/lib/store/menuStore'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { usePosStore } from '@/lib/store/posStore'
import { startConfigPolling, stopConfigPolling } from '@/lib/configSync'
import type { DeviceConfig, MenuConfig, PeriodConfig, ServiceCodeConfig } from '@/types/menu'
import { identifyInput } from '@/lib/payment/barcode'
import { generateOrderId } from '@/lib/payment/order'
import { savePendingPayment, checkAndMarkBarcode, getPendingPayments, markPaymentSynced } from '@/lib/db/indexeddb'
import { createDeviceBridge, type DeviceBridge } from '@/lib/device/bridge'
import { getServerUrl } from '@/lib/serverUrl'

import ActivationScreen from '@/components/pos/ActivationScreen'
import PosScreen from '@/components/pos/screens/PosScreen'
import KioskScreen from '@/components/pos/screens/KioskScreen'
import TableOrderScreen from '@/components/pos/screens/TableOrderScreen'
import BarcodeReader from '@/components/pos/BarcodeReader'
import StatusBar from '@/components/pos/StatusBar'
import RealTimeDashboard from '@/components/pos/RealTimeDashboard'
import ScanWaitScreen from '@/components/pos/ScanWaitScreen'
import ProcessingScreen from '@/components/pos/ProcessingScreen'
import SuccessScreen from '@/components/pos/SuccessScreen'
import FailScreen from '@/components/pos/FailScreen'
import OfflineScreen from '@/components/pos/OfflineScreen'
import ScanLogBar from '@/components/pos/ScanLogBar'
import { recordMealUsage } from '@/lib/meal/mealRecord'
import BadgeScreen from '@/components/pos/screens/BadgeScreen'
import type { MealType } from '@/types/menu'

export default function PosPage() {
  const { menus, getActiveMenus, getCurrentMode, incrementCount, loadDefaults } = useMenuStore()
  const { config, isOnline, setOnline, setPendingCount, updateConfig } = useSettingsStore()
  const {
    screen, selectedMenu, lastTransaction, lastError,
    setScreen, clearMenu, setLastTransaction, setLastError
  } = usePosStore()

  const { deviceToken, terminalType } = useSettingsStore()
  const [mounted, setMounted] = useState(false)
  const [txRefreshTrigger, setTxRefreshTrigger] = useState(0)
  const [badgeResult, setBadgeResult] = useState<{
    variant: 'success' | 'warn'
    employeeName: string
    department?: string
    mealType: MealType
  } | null>(null)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!deviceToken || deviceToken === 'manual') return
    const sendHeartbeat = async () => {
      try {
        await fetch(getServerUrl() + '/api/device/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deviceToken}`,
          },
          body: JSON.stringify({ status: 'online' }),
        })
      } catch (err) {
        console.error('[heartbeat] failed:', err)
      }
    }
    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 30_000)
    return () => clearInterval(interval)
  }, [deviceToken])

  useEffect(() => {
    if (!deviceToken || deviceToken === 'manual') return
    startConfigPolling(
      (serverConfig, termName) => {
        const { menus, periods, serviceCodes, ...deviceConfig } = serverConfig as
          { menus?: MenuConfig[]; periods?: PeriodConfig[]; serviceCodes?: ServiceCodeConfig[] }
          & Partial<DeviceConfig>
        updateConfig({ ...deviceConfig, ...(termName != null ? { termName } : {}) })
        if (Array.isArray(menus)) useMenuStore.getState().setMenus(menus)
        if (Array.isArray(periods)) useMenuStore.getState().setPeriods(periods)
        if (Array.isArray(serviceCodes)) useMenuStore.getState().setServiceCodes(serviceCodes)
      },
      deviceToken
    )
    return () => stopConfigPolling()
  }, [deviceToken])

  const lastMsgRef = useRef<string>('')
  const bridgeRef = useRef<DeviceBridge | null>(null)
  const [scanLog, setScanLog] = useState<{value: string; time: Date} | null>(null)
  const scanLogTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadDefaults()
    bridgeRef.current = createDeviceBridge()
  }, [])

  useEffect(() => {
    if (!config.serialPort || !bridgeRef.current) return
    bridgeRef.current.connect(config.serialPort).catch(() => {})
    return () => {
      bridgeRef.current?.disconnect().catch(() => {})
    }
  }, [config.serialPort])

  useEffect(() => {
    if (screen === 'success') {
      bridgeRef.current?.sendCommand({ type: 'SIGNAL_LIGHT', color: 'green' })
    } else if (screen === 'fail') {
      bridgeRef.current?.sendCommand({ type: 'SIGNAL_LIGHT', color: 'red' })
    }
  }, [screen])

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      syncOffline()
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 앱 시작 시 이미 온라인이면 즉시 오프라인 큐 동기화
  useEffect(() => {
    if (!deviceToken || deviceToken === 'manual') return
    if (typeof window !== 'undefined' && navigator.onLine) syncOffline()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceToken])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      getPendingPayments().then(p => setPendingCount(p.length))
    }
  }, [screen])

  async function syncOffline() {
    const pending = await getPendingPayments()
    if (pending.length === 0) return

    const retryDelays = [0, 5_000, 30_000]
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (retryDelays[attempt] > 0) await new Promise(r => setTimeout(r, retryDelays[attempt]))
      if (!navigator.onLine) return
      try {
        const res = await fetch(getServerUrl() + '/api/payment/offline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: pending }),
        })
        if (res.ok) {
          const result = await res.json()
          const syncedIds: string[] = result.syncedIds ?? pending.map(r => r.merchantOrderID)
          await Promise.all(syncedIds.map(id => markPaymentSynced(id)))
          const remaining = await getPendingPayments()
          setPendingCount(remaining.length)
          return
        }
      } catch {
        if (attempt === retryDelays.length - 1) return
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (screen === 'single' || screen === 'menu-select') {
        const mode = getCurrentMode()
        if (mode === 'multi' && screen === 'single') setScreen('menu-select')
        else if (mode === 'single' && screen === 'menu-select') setScreen('single')
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [screen, getCurrentMode])

  useEffect(() => {
    const checkReset = setInterval(() => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        useMenuStore.getState().resetCount()
      }
    }, 60_000)
    return () => clearInterval(checkReset)
  }, [])

  const handleScan = useCallback(async (input: string) => {
    if (screen === 'processing') return

    if (scanLogTimerRef.current) clearTimeout(scanLogTimerRef.current)
    setScanLog({ value: input, time: new Date() })
    scanLogTimerRef.current = setTimeout(() => setScanLog(null), 4000)

    const identity = identifyInput(input)

    // inputPolicy 분기
    const inputType = identity.type as 'barcode' | 'qr' | 'rfcard'
    const action = config.inputPolicy?.[inputType] ?? 'bizplay_payment'

    if (action === 'disabled') return

    if (action === 'meal_record') {
      setScreen('processing')
      const result = await recordMealUsage(identity.raw, deviceToken ?? '')
      if (result.status === 'error') {
        const errorMessages: Record<string, string> = {
          EMPLOYEE_NOT_FOUND: '등록되지 않은 사원증입니다.',
          DUPLICATE_BLOCKED: '이미 이용하셨습니다.',
          SERVER_ERROR: '처리 중 오류가 발생했습니다.',
        }
        setLastError(errorMessages[result.code] ?? '오류가 발생했습니다.')
        setScreen('fail')
        return
      }
      setBadgeResult({
        variant: result.status === 'warn' ? 'warn' : 'success',
        employeeName: result.employeeName,
        department: result.department,
        mealType: result.mealType,
      })
      setScreen('single')
      return
    }

    if (identity.voucherType === 'unknown') {
      setLastError('인식할 수 없는 바코드입니다.')
      setScreen('fail')
      return
    }

    const menu = selectedMenu ?? getActiveMenus()[0]
    if (!menu) {
      setLastError('현재 운영 중인 메뉴가 없습니다.')
      setScreen('fail')
      return
    }

    let amount = menu.paymentAmount
    if (identity.serviceCode) {
      const scAmount = useMenuStore.getState().getAmountByServiceCode(identity.serviceCode)
      if (scAmount !== null) amount = scAmount
    }

    setScreen('processing')

    try {
      const isNew = await checkAndMarkBarcode(identity.raw)
      if (!isNew) {
        setLastError('이미 처리된 바코드입니다. (중복 방지)')
        setScreen('fail')
        return
      }

      const { merchantOrderDt, merchantOrderID } = generateOrderId(config.termId)

      if (!isOnline) {
        await savePendingPayment({
          merchantOrderDt,
          merchantOrderID,
          barcodeType: identity.barcodeType,
          barcodeInfo: identity.raw,
          totalAmount: amount,
          productName: menu.name,
          termId: config.termId,
          savedAt: new Date().toISOString(),
          synced: false,
        })
        incrementCount(menu.id)
        lastMsgRef.current = '오프라인 결제 저장'
        const fakeTx = {
          id: merchantOrderID,
          merchantOrderID,
          tid: '',
          menuId: menu.id,
          menuName: menu.name,
          userName: '(오프라인)',
          amount,
          paymentType: identity.type,
          voucherType: identity.voucherType,
          status: 'pending_offline' as const,
          approvedAt: new Date().toISOString(),
          barcodeInfo: identity.raw,
          synced: false,
          createdAt: new Date().toISOString(),
        }
        setLastTransaction(fakeTx)
        setTxRefreshTrigger(t => t + 1)
        setScreen('success')
        return
      }

      const reserveRes = await fetch(getServerUrl() + '/api/payment/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantOrderDt,
          merchantOrderID,
          productName: menu.name,
          quantity: 1,
          totalAmount: amount,
          taxFreeAmount: amount,
          productItems: [{
            seq: '1', category: 'F',
            biz_no: config.merchantId || '0000000000',
            name: menu.name, count: 1, amount,
          }],
          complexYn: 'N',
          barcodeType: identity.barcodeType,
          barcodeInfo: identity.raw,
          termId: config.termId,
        }),
      }).then(r => r.json())

      if (reserveRes.code !== '0000') {
        setLastError(reserveRes.msg)
        setScreen('fail')
        return
      }

      const approveRes = await fetch(getServerUrl() + '/api/payment/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deviceToken ?? ''}`,
        },
        body: JSON.stringify({
          merchantOrderDt,
          merchantOrderID,
          tid: reserveRes.data.tid,
          totalAmount: amount,
          token: reserveRes.data.token,
          menuId: menu.id,
          menuName: menu.name,
          barcodeInfo: identity.raw,
          termId: config.termId,
        }),
      }).then(r => r.json())

      if (approveRes.code !== '0000') {
        setLastError(approveRes.msg)
        setScreen('fail')
        return
      }

      incrementCount(menu.id)
      setLastTransaction(approveRes.transaction)
      lastMsgRef.current = '정상결제 됨.'
      clearMenu()
      setTxRefreshTrigger(t => t + 1)
      setScreen('success')

      try {
        const audio = new Audio(`/sounds/${menu.soundFile}`)
        audio.play().catch(() => {})
      } catch {}

    } catch (err) {
      console.error('[payment] Error:', err)
      setLastError('결제 처리 중 오류가 발생했습니다.')
      setScreen('fail')
    }
  }, [screen, selectedMenu, isOnline, config, getActiveMenus, incrementCount, setScreen])

  const handleDone = useCallback(() => {
    const mode = getCurrentMode()
    clearMenu()
    setLastTransaction(null)
    setLastError(null)
    setScreen(mode === 'multi' ? 'menu-select' : 'single')
  }, [getCurrentMode])

  const renderMainScreen = () => {
    if (!isOnline && screen !== 'processing') return <OfflineScreen />
    if (screen === 'scan-wait') return <ScanWaitScreen />
    return <RealTimeDashboard refreshTrigger={txRefreshTrigger} />
  }

  if (!mounted) return null
  if (!deviceToken) return (
    <div className="flex-1 flex flex-col">
      <ActivationScreen />
    </div>
  )
  if (terminalType === 'pos') return <PosScreen />
  if (terminalType === 'kiosk') return <KioskScreen />
  if (terminalType === 'table_order') return <TableOrderScreen />

  return (
    <>
      <BarcodeReader
        onScan={handleScan}
        enabled={screen !== 'processing'}
        readerType={config.barcodeReaderType ?? 'keyboard'}
        serialPort={config.barcodePort}
      />

      {/* ── 단일 컬럼 (일반: < 1024px / 학생식당: < 768px) ── */}
      {config.cafeteriaMode ? (
        <div className="md:hidden flex-1 flex flex-col overflow-hidden mx-auto w-full">
          <div className="flex-1 overflow-hidden">
            {renderMainScreen()}
          </div>
          <ScanLogBar value={scanLog?.value ?? null} time={scanLog?.time ?? null} />
          <StatusBar lastMessage={lastMsgRef.current} lastOrderId={lastTransaction?.merchantOrderID} />
        </div>
      ) : (
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden max-w-[600px] md:max-w-[720px] mx-auto w-full">
          <div className="flex-1 overflow-hidden">
            {renderMainScreen()}
          </div>
          <ScanLogBar value={scanLog?.value ?? null} time={scanLog?.time ?? null} />
          <StatusBar lastMessage={lastMsgRef.current} lastOrderId={lastTransaction?.merchantOrderID} />
        </div>
      )}

      {/* ── 2패널 (일반: ≥ 1024px / 학생식당: ≥ 768px) ── */}
      {config.cafeteriaMode ? (
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="flex flex-col overflow-hidden" style={{ flex: '0 0 58%' }}>
            <div className="flex-1 overflow-hidden">
              {!isOnline && screen !== 'processing' ? <OfflineScreen /> : <ScanWaitScreen />}
            </div>
            <ScanLogBar value={scanLog?.value ?? null} time={scanLog?.time ?? null} />
            <StatusBar lastMessage={lastMsgRef.current} lastOrderId={lastTransaction?.merchantOrderID} />
          </div>
          <div className="flex flex-col overflow-hidden border-l border-white/10" style={{ flex: '0 0 42%' }}>
            <RealTimeDashboard refreshTrigger={txRefreshTrigger} />
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 overflow-hidden">
          <div className="flex flex-col overflow-hidden" style={{ flex: '0 0 58%' }}>
            <div className="flex-1 overflow-hidden">
              {!isOnline && screen !== 'processing' ? <OfflineScreen /> : <ScanWaitScreen />}
            </div>
            <ScanLogBar value={scanLog?.value ?? null} time={scanLog?.time ?? null} />
            <StatusBar lastMessage={lastMsgRef.current} lastOrderId={lastTransaction?.merchantOrderID} />
          </div>
          <div className="flex flex-col overflow-hidden border-l border-white/10" style={{ flex: '0 0 42%' }}>
            <RealTimeDashboard refreshTrigger={txRefreshTrigger} />
          </div>
        </div>
      )}

      {/* 오버레이 (모든 해상도 공통) */}
      {screen === 'processing' && <ProcessingScreen />}
      {screen === 'success' && (
        <SuccessScreen
          orderId={lastTransaction?.merchantOrderID}
          amount={lastTransaction?.amount}
          userName={lastTransaction?.userName}
          onDone={handleDone}
        />
      )}
      {screen === 'fail' && (
        <FailScreen
          errorMsg={lastError ?? undefined}
          onDone={handleDone}
        />
      )}
      {badgeResult && (
        <BadgeScreen
          variant={badgeResult.variant}
          employeeName={badgeResult.employeeName}
          department={badgeResult.department}
          mealType={badgeResult.mealType}
          onDone={() => {
            setBadgeResult(null)
            const mode = getCurrentMode()
            setScreen(mode === 'multi' ? 'menu-select' : 'single')
          }}
        />
      )}
    </>
  )
}
