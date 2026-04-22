'use client'
import { useState, useCallback } from 'react'
import { useMenuStore } from '@/lib/store/menuStore'
import { useSettingsStore } from '@/lib/store/settingsStore'
import ProcessingScreen from '@/components/pos/ProcessingScreen'
import SuccessScreen from '@/components/pos/SuccessScreen'
import FailScreen from '@/components/pos/FailScreen'
import BarcodeReader from '@/components/pos/BarcodeReader'
import StatusBar from '@/components/pos/StatusBar'
import { identifyInput } from '@/lib/payment/barcode'
import { generateOrderId } from '@/lib/payment/order'

type CartItem = { menuId: string; name: string; price: number; qty: number }
type KioskStep = 'menu' | 'cart' | 'scan'
type KioskPhase = KioskStep | 'processing' | 'success' | 'fail'

const STEPS: { key: KioskStep; label: string }[] = [
  { key: 'menu', label: '메뉴 선택' },
  { key: 'cart', label: '주문 확인' },
  { key: 'scan', label: '결제' },
]

export default function KioskScreen() {
  const { posMenuItems, posCategories } = useMenuStore()
  const { config, deviceToken } = useSettingsStore()
  const availableItems = posMenuItems.filter(m => m.isAvailable)

  const [cart, setCart] = useState<CartItem[]>([])
  const [phase, setPhase] = useState<KioskPhase>('menu')
  const [lastOrderId, setLastOrderId] = useState<string | undefined>()
  const [lastAmount, setLastAmount] = useState<number | undefined>()
  const [errorMsg, setErrorMsg] = useState<string | undefined>()

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const totalQty = cart.reduce((s, i) => s + i.qty, 0)

  const addToCart = (item: (typeof posMenuItems)[0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuId === item.id)
      if (existing) return prev.map(c => c.menuId === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { menuId: item.id, name: item.name, price: item.price, qty: 1 }]
    })
  }

  const changeQty = (menuId: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.menuId === menuId ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    )
  }

  const handleScan = useCallback(async (input: string) => {
    if (phase !== 'scan') return
    setPhase('processing')
    try {
      const { merchantOrderDt, merchantOrderID } = generateOrderId(config.termId)
      const productName = cart.map(c => c.name).join(', ')
      const identity = identifyInput(input)

      const reserveRes = await fetch('/api/payment/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantOrderDt, merchantOrderID, productName,
          quantity: cart.reduce((s, c) => s + c.qty, 0),
          totalAmount: total, taxFreeAmount: total,
          productItems: cart.map((c, i) => ({
            seq: String(i + 1), category: 'F',
            biz_no: config.merchantId || '0000000000',
            name: c.name, count: c.qty, amount: c.price * c.qty,
          })),
          complexYn: cart.length > 1 ? 'Y' : 'N',
          barcodeType: identity.barcodeType, barcodeInfo: identity.raw,
          termId: config.termId,
        }),
      }).then(r => r.json())

      if (reserveRes.code !== '0000') { setErrorMsg(reserveRes.msg); setPhase('fail'); return }

      const approveRes = await fetch('/api/payment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken ?? ''}` },
        body: JSON.stringify({
          merchantOrderDt, merchantOrderID,
          tid: reserveRes.data.tid, totalAmount: total, token: reserveRes.data.token,
          menuId: cart[0].menuId, menuName: productName,
          barcodeInfo: identity.raw, termId: config.termId,
        }),
      }).then(r => r.json())

      if (approveRes.code !== '0000') { setErrorMsg(approveRes.msg); setPhase('fail'); return }

      setLastOrderId(merchantOrderID)
      setLastAmount(total)
      setCart([])
      setPhase('success')
    } catch {
      setErrorMsg('결제 처리 중 오류가 발생했습니다.')
      setPhase('fail')
    }
  }, [phase, cart, total, config])

  const handleDone = () => { setErrorMsg(undefined); setPhase('menu') }

  if (phase === 'processing') return <ProcessingScreen />
  if (phase === 'success') return <SuccessScreen orderId={lastOrderId} amount={lastAmount} onDone={handleDone} />
  if (phase === 'fail') return <FailScreen errorMsg={errorMsg} onDone={handleDone} />

  const currentStep = phase as KioskStep

  return (
    <>
      <BarcodeReader
        onScan={handleScan}
        enabled={phase === 'scan'}
        readerType={config.barcodeReaderType ?? 'keyboard'}
        serialPort={config.barcodePort}
      />

      {/* 세로 레이아웃 — 중앙 단일 컬럼 */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* 스텝 인디케이터 */}
        <div className="shrink-0 flex items-center justify-center gap-0 py-4 px-6"
          style={{ background: 'rgba(5,14,31,0.50)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {STEPS.map((step, i) => {
            const done = STEPS.findIndex(s => s.key === currentStep) > i
            const active = step.key === currentStep
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: active ? 'rgba(96,165,250,0.80)' : done ? 'rgba(34,197,94,0.60)' : 'rgba(255,255,255,0.10)',
                      color: active || done ? '#fff' : 'rgba(255,255,255,0.30)',
                    }}>{done ? '✓' : i + 1}</span>
                  <span className="text-sm font-medium"
                    style={{ color: active ? 'rgba(255,255,255,0.90)' : done ? 'rgba(34,197,94,0.80)' : 'rgba(255,255,255,0.30)' }}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="mx-3 text-white/20 text-xs">›</span>
                )}
              </div>
            )
          })}
        </div>

        {/* 메뉴 선택 스텝 */}
        {currentStep === 'menu' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {availableItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/25 text-center">
                  <div className="text-5xl mb-4">🍽</div>
                  <div className="text-lg font-medium">등록된 메뉴가 없습니다</div>
                </div>
              ) : (
                <div className="max-w-sm mx-auto space-y-5">
                  {posCategories.filter(cat => availableItems.some(m => m.categoryId === cat.id)).map(cat => (
                    <div key={cat.id}>
                      <div className="text-xs text-white/35 uppercase tracking-widest font-semibold mb-2 px-1">{cat.name}</div>
                      <div className="space-y-2">
                        {availableItems.filter(m => m.categoryId === cat.id).map(item => {
                          const inCart = cart.find(c => c.menuId === item.id)
                          return (
                            <button key={item.id} onClick={() => addToCart(item)}
                              className="w-full flex items-center gap-4 rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
                              style={{
                                background: inCart ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)',
                                border: `1.5px solid ${inCart ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.10)'}`,
                              }}>
                              <span className="text-4xl shrink-0">🍱</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-bold text-xl">{item.name}</div>
                                {item.description && <div className="text-sm text-white/40 mt-0.5 truncate">{item.description}</div>}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-xl" style={{ color: 'rgba(96,165,250,0.95)' }}>
                                  {item.price.toLocaleString()}원
                                </div>
                                {inCart && <div className="text-sm text-white/50 mt-0.5">× {inCart.qty}</div>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 다음 버튼 */}
            {cart.length > 0 && (
              <div className="shrink-0 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="max-w-sm mx-auto">
                  <button onClick={() => setPhase('cart')}
                    className="w-full py-5 rounded-2xl font-bold text-white text-xl transition-all"
                    style={{ background: 'rgba(96,165,250,0.30)', border: '1.5px solid rgba(96,165,250,0.55)' }}>
                    주문 확인  ({totalQty}개)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 주문 확인 스텝 */}
        {currentStep === 'cart' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="max-w-sm mx-auto space-y-3">
                {cart.map(item => (
                  <div key={item.menuId} className="flex items-center gap-4 rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg">{item.name}</div>
                      <div className="text-sm text-white/40 mt-0.5">{item.price.toLocaleString()}원</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => changeQty(item.menuId, -1)}
                        className="w-10 h-10 rounded-xl text-white text-xl flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.10)' }}>−</button>
                      <span className="text-white font-bold text-lg w-6 text-center">{item.qty}</span>
                      <button onClick={() => changeQty(item.menuId, 1)}
                        className="w-10 h-10 rounded-xl text-white text-xl flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.10)' }}>+</button>
                    </div>
                    <div className="text-white font-bold text-lg w-24 text-right shrink-0">
                      {(item.price * item.qty).toLocaleString()}원
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-3 pb-1 px-1">
                  <span className="text-white/50 text-lg">합계</span>
                  <span className="text-white font-bold text-3xl">{total.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 px-5 py-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="max-w-sm mx-auto flex gap-3">
                <button onClick={() => setPhase('menu')}
                  className="flex-1 py-4 rounded-2xl font-semibold text-white/60 text-base transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  ← 메뉴로
                </button>
                <button onClick={() => setPhase('scan')}
                  className="flex-1 py-4 rounded-2xl font-bold text-white text-lg transition-all"
                  style={{ background: 'rgba(96,165,250,0.30)', border: '1.5px solid rgba(96,165,250,0.55)' }}>
                  결제하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 결제 스텝 */}
        {currentStep === 'scan' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
            <div className="max-w-xs mx-auto w-full">
              <div className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6 text-6xl"
                style={{ background: 'rgba(96,165,250,0.12)', border: '2px solid rgba(96,165,250,0.35)' }}>
                📲
              </div>
              <div className="text-white font-bold text-2xl mb-2">식권 / 바코드 스캔</div>
              <div className="text-white/40 text-base mb-1">결제 금액</div>
              <div className="text-white font-bold text-4xl mb-8">{total.toLocaleString()}원</div>

              <button onClick={() => setPhase('cart')}
                className="w-full py-4 rounded-2xl text-white/40 hover:text-white/60 transition-colors text-base font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                ← 돌아가기
              </button>
            </div>
          </div>
        )}

        <StatusBar />
      </div>
    </>
  )
}
