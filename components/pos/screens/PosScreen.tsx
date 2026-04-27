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
import { getServerUrl } from '@/lib/serverUrl'

type CartItem = { menuId: string; name: string; price: number; qty: number; soundFile?: string }
type PosPhase = 'order' | 'processing' | 'success' | 'fail'

export default function PosScreen() {
  const { posMenuItems, posCategories } = useMenuStore()
  const { config, deviceToken } = useSettingsStore()
  const availableItems = posMenuItems.filter(m => m.isAvailable)

  const [cart, setCart] = useState<CartItem[]>([])
  const [phase, setPhase] = useState<PosPhase>('order')
  const [lastOrderId, setLastOrderId] = useState<string | undefined>()
  const [lastAmount, setLastAmount] = useState<number | undefined>()
  const [errorMsg, setErrorMsg] = useState<string | undefined>()
  const [waitingBarcode, setWaitingBarcode] = useState(false)

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

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

  const handlePayment = async (barcodeInfo: string) => {
    setWaitingBarcode(false)
    setPhase('processing')
    try {
      const { merchantOrderDt, merchantOrderID } = generateOrderId(config.termId)
      const productName = cart.map(c => c.name).join(', ')
      const identity = identifyInput(barcodeInfo)

      const reserveRes = await fetch(getServerUrl() + '/api/payment/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken ?? ''}` },
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
          barcodeType: identity.barcodeType,
          barcodeInfo: identity.raw,
          termId: config.termId,
        }),
      }).then(r => r.json())

      if (reserveRes.code !== '0000') { setErrorMsg(reserveRes.msg); setPhase('fail'); return }

      const approveRes = await fetch(getServerUrl() + '/api/payment/approve', {
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
  }

  const handleScan = useCallback((input: string) => {
    if (phase !== 'order' || !waitingBarcode) return
    handlePayment(input)
  }, [phase, waitingBarcode, cart, total])

  const handleDone = () => { setErrorMsg(undefined); setPhase('order') }

  return (
    <>
      <BarcodeReader
        onScan={handleScan}
        enabled={phase === 'order' && waitingBarcode}
        readerType={config.barcodeReaderType ?? 'keyboard'}
        serialPort={config.barcodePort}
      />

      {/* 가로 2분할: 직원(좌) + 고객 디스플레이(우) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">

          {/* ── 직원 패널 (좌) ── */}
          <div className="flex flex-col overflow-hidden" style={{ flex: '0 0 55%', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            {/* 메뉴 그리드 */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-semibold">메뉴 선택</div>
              {availableItems.length === 0 ? (
                <div className="flex items-center justify-center h-32 rounded-xl text-white/25 text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  등록된 메뉴가 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {posCategories.filter(cat => availableItems.some(m => m.categoryId === cat.id)).map(cat => (
                    <div key={cat.id}>
                      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-semibold">{cat.name}</div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {availableItems.filter(m => m.categoryId === cat.id).map(item => {
                          const inCart = cart.find(c => c.menuId === item.id)
                          return (
                            <button key={item.id} onClick={() => addToCart(item)}
                              className="rounded-xl p-3 text-left transition-all active:scale-[0.97] relative"
                              style={{
                                background: inCart ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${inCart ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.10)'}`,
                              }}>
                              {inCart && (
                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white"
                                  style={{ background: 'rgba(96,165,250,0.80)' }}>{inCart.qty}</span>
                              )}
                              <div className="text-white font-semibold text-sm mb-0.5 truncate">{item.name}</div>
                              <div className="text-xs font-medium" style={{ color: 'rgba(96,165,250,0.85)' }}>
                                {item.price.toLocaleString()}원
                              </div>
                              {item.description && <div className="text-[10px] text-white/25 mt-0.5 truncate">{item.description}</div>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 직원용 카트 + 결제 */}
            <div className="border-t border-white/08 p-3 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {cart.length > 0 && (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.menuId} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <span className="text-white text-sm flex-1 truncate">{item.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => changeQty(item.menuId, -1)}
                          className="w-5 h-5 rounded text-white/50 hover:text-white text-xs flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.10)' }}>−</button>
                        <span className="text-white text-xs w-4 text-center font-medium">{item.qty}</span>
                        <button onClick={() => changeQty(item.menuId, 1)}
                          className="w-5 h-5 rounded text-white/50 hover:text-white text-xs flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.10)' }}>+</button>
                      </div>
                      <span className="text-white/50 text-xs w-16 text-right shrink-0">
                        {(item.price * item.qty).toLocaleString()}원
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {cart.length > 0 && (
                  <button onClick={() => setCart([])}
                    className="px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white/70 transition-colors"
                    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                    취소
                  </button>
                )}
                <button
                  onClick={() => { if (cart.length > 0) setWaitingBarcode(v => !v) }}
                  disabled={cart.length === 0}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-30"
                  style={{
                    background: waitingBarcode ? 'rgba(34,197,94,0.30)' : 'rgba(96,165,250,0.28)',
                    border: `1px solid ${waitingBarcode ? 'rgba(34,197,94,0.50)' : 'rgba(96,165,250,0.45)'}`,
                  }}>
                  {cart.length === 0 ? '메뉴를 선택하세요' : waitingBarcode ? '스캔 대기 중 — 취소' : `결제  ${total.toLocaleString()}원`}
                </button>
              </div>
            </div>
          </div>

          {/* ── 고객 디스플레이 (우) — showPaymentList가 false면 숨김 (기본 표시) ── */}
          {config.showPaymentList !== false && <div className="flex flex-col overflow-hidden" style={{ flex: '0 0 45%' }}>
            <div className="px-5 py-3 border-b border-white/08 flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">고객 화면</span>
            </div>

            {/* 주문 내역 (고객용 큰 글씨) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/20 text-center">
                  <div className="text-4xl mb-3">🛒</div>
                  <div className="text-base">주문할 메뉴를 선택해 주세요</div>
                </div>
              ) : cart.map(item => (
                <div key={item.menuId} className="flex items-center justify-between py-2 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div>
                    <div className="text-white font-medium text-base">{item.name}</div>
                    {item.qty > 1 && <div className="text-xs text-white/35">{item.price.toLocaleString()}원 × {item.qty}</div>}
                  </div>
                  <div className="text-white font-semibold text-base">{(item.price * item.qty).toLocaleString()}원</div>
                </div>
              ))}
            </div>

            {/* 합계 + 결제 안내 */}
            <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-end justify-between mb-4">
                <span className="text-white/50 text-sm">합계</span>
                <span className="text-white font-bold text-3xl">{total > 0 ? `${total.toLocaleString()}원` : '—'}</span>
              </div>

              {waitingBarcode ? (
                <div className="rounded-xl py-4 text-center"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)' }}>
                  <div className="text-2xl mb-1">📲</div>
                  <div className="text-green-300 font-semibold text-sm">식권 / 바코드를 스캔해 주세요</div>
                </div>
              ) : cart.length > 0 ? (
                <div className="rounded-xl py-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-white/30 text-sm">결제 대기 중</div>
                </div>
              ) : null}
            </div>
          </div>}
        </div>

        <StatusBar />
      </div>

      {phase === 'processing' && <ProcessingScreen />}
      {phase === 'success' && <SuccessScreen orderId={lastOrderId} amount={lastAmount} menuSoundFile={cart[0]?.soundFile} onDone={handleDone} />}
      {phase === 'fail' && <FailScreen errorMsg={errorMsg} onDone={handleDone} />}
    </>
  )
}
