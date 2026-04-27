'use client'
import { useState } from 'react'
import { useMenuStore } from '@/lib/store/menuStore'
import { useSettingsStore } from '@/lib/store/settingsStore'
import StatusBar from '@/components/pos/StatusBar'

type OrderItem = { menuId: string; name: string; price: number; qty: number }
type TableStatus = 'empty' | 'ordering' | 'waiting'
type Table = { id: number; status: TableStatus; orders: OrderItem[] }

function initTables(count: number): Table[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1, status: 'empty', orders: [],
  }))
}

export default function TableOrderScreen() {
  const { posMenuItems, posCategories } = useMenuStore()
  const { config } = useSettingsStore()
  const tableCount = config.tableCount ?? 12
  const availableItems = posMenuItems.filter(m => m.isAvailable)

  const [tables, setTables] = useState<Table[]>(() => initTables(tableCount))
  const [selectedTable, setSelectedTable] = useState<number | null>(null)

  const currentTable = tables.find(t => t.id === selectedTable) ?? null
  const tableTotal = currentTable?.orders.reduce((s, o) => s + o.price * o.qty, 0) ?? 0

  const addOrder = (item: (typeof posMenuItems)[0]) => {
    if (!selectedTable) return
    setTables(prev => prev.map(t => {
      if (t.id !== selectedTable) return t
      const existing = t.orders.find(o => o.menuId === item.id)
      const orders = existing
        ? t.orders.map(o => o.menuId === item.id ? { ...o, qty: o.qty + 1 } : o)
        : [...t.orders, { menuId: item.id, name: item.name, price: item.price, qty: 1 }]
      return { ...t, orders, status: 'ordering' as TableStatus }
    }))
  }

  const changeQty = (menuId: string, delta: number) => {
    if (!selectedTable) return
    setTables(prev => prev.map(t => {
      if (t.id !== selectedTable) return t
      const orders = t.orders
        .map(o => o.menuId === menuId ? { ...o, qty: o.qty + delta } : o)
        .filter(o => o.qty > 0)
      const status: TableStatus = orders.length === 0 ? 'empty' : t.status
      return { ...t, orders, status }
    }))
  }

  const sendOrder = () => {
    if (!selectedTable || !currentTable || currentTable.orders.length === 0) return
    setTables(prev => prev.map(t =>
      t.id === selectedTable ? { ...t, status: 'waiting' as TableStatus } : t
    ))
    setSelectedTable(null)
  }

  const clearTable = (tableId: number) => {
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, status: 'empty', orders: [] } : t
    ))
    if (selectedTable === tableId) setSelectedTable(null)
  }

  const statusColor: Record<TableStatus, string> = {
    empty: 'rgba(255,255,255,0.06)',
    ordering: 'rgba(251,191,36,0.15)',
    waiting: 'rgba(34,197,94,0.15)',
  }
  const statusBorder: Record<TableStatus, string> = {
    empty: 'rgba(255,255,255,0.10)',
    ordering: 'rgba(251,191,36,0.35)',
    waiting: 'rgba(34,197,94,0.35)',
  }
  const statusLabel: Record<TableStatus, string> = {
    empty: '빈 테이블',
    ordering: '주문 중',
    waiting: '서빙 대기',
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
      {/* 테이블 그리드 */}
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-white/40 uppercase tracking-wider font-medium">
            {config.name || config.corner || '테이블 현황'}
          </div>
          <div className="flex gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.25)' }} />빈 테이블
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'rgba(251,191,36,0.70)' }} />주문 중
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'rgba(34,197,94,0.70)' }} />서빙 대기
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {tables.map(table => (
            <button key={table.id}
              onClick={() => setSelectedTable(table.id === selectedTable ? null : table.id)}
              className="rounded-xl p-4 text-left transition-all"
              style={{
                background: table.id === selectedTable ? 'rgba(96,165,250,0.20)' : statusColor[table.status],
                border: `1px solid ${table.id === selectedTable ? 'rgba(96,165,250,0.50)' : statusBorder[table.status]}`,
              }}>
              <div className="text-white font-bold text-lg mb-1">{table.id}번</div>
              <div className="text-xs" style={{
                color: table.status === 'empty' ? 'rgba(255,255,255,0.30)'
                  : table.status === 'ordering' ? 'rgba(251,191,36,0.80)'
                  : 'rgba(34,197,94,0.80)',
              }}>
                {statusLabel[table.status]}
              </div>
              {table.orders.length > 0 && (
                <div className="text-xs text-white/40 mt-1">
                  {table.orders.reduce((s, o) => s + o.qty, 0)}개 항목
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 주문 패널 */}
      <div className="w-80 shrink-0 flex flex-col border-l border-white/10">
        {!selectedTable ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/25 text-sm p-6 text-center">
            <div className="text-3xl mb-3">🪑</div>
            테이블을 선택하면<br />주문을 받을 수 있습니다
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="text-white font-semibold">{selectedTable}번 테이블</div>
              {currentTable && currentTable.status !== 'empty' && (
                <button onClick={() => clearTable(selectedTable)}
                  className="text-xs text-red-400/70 hover:text-red-400 transition-colors px-2 py-1 rounded"
                  style={{ background: 'rgba(239,68,68,0.08)' }}>
                  정리
                </button>
              )}
            </div>

            {/* 메뉴 선택 */}
            <div className="p-3 border-b border-white/10">
              <div className="text-xs text-white/40 mb-2">메뉴 추가</div>
              {availableItems.length === 0 ? (
                <div className="text-xs text-white/25">등록된 메뉴 없음</div>
              ) : (
                <div className="space-y-2">
                  {posCategories.filter(cat => availableItems.some(m => m.categoryId === cat.id)).map(cat => (
                    <div key={cat.id}>
                      <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{cat.name}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {availableItems.filter(m => m.categoryId === cat.id).map(item => (
                          <button key={item.id} onClick={() => addOrder(item)}
                            className="rounded-lg px-2.5 py-2 text-left transition-all"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}>
                            <div className="text-white text-xs font-medium truncate">{item.name}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'rgba(96,165,250,0.80)' }}>
                              {item.price.toLocaleString()}원
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 주문 목록 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!currentTable || currentTable.orders.length === 0 ? (
                <div className="text-center text-white/25 text-xs pt-4">메뉴를 추가하세요</div>
              ) : currentTable.orders.map(order => (
                <div key={order.menuId} className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{order.name}</div>
                    <div className="text-xs text-white/35">{(order.price * order.qty).toLocaleString()}원</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => changeQty(order.menuId, -1)}
                      className="w-5 h-5 rounded text-white/50 hover:text-white text-xs flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>−</button>
                    <span className="text-white text-xs w-4 text-center">{order.qty}</span>
                    <button onClick={() => changeQty(order.menuId, 1)}
                      className="w-5 h-5 rounded text-white/50 hover:text-white text-xs flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* 하단 액션 */}
            <div className="p-4 border-t border-white/10 space-y-2">
              {currentTable && currentTable.orders.length > 0 && (
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/50 text-sm">합계</span>
                  <span className="text-white font-bold">{tableTotal.toLocaleString()}원</span>
                </div>
              )}
              <button
                onClick={sendOrder}
                disabled={!currentTable || currentTable.orders.length === 0}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-30"
                style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
                주문 전송
              </button>
            </div>
          </>
        )}
      </div>
      </div>
      <StatusBar />
    </div>
  )
}
