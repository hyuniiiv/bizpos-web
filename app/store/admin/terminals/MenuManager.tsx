'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type MenuType = 'pos' | 'kiosk' | 'ticket_checker' | 'table_order'

const MENU_LABELS: Record<MenuType, string> = {
  pos: 'POS',
  kiosk: 'KIOSK',
  ticket_checker: '식권체크',
  table_order: '테이블 오더',
}

interface MenuItem {
  id: string
  name: string
}

interface MenuManagerProps {
  terminal: {
    id: string
    term_id: string
    name: string | null
    terminal_type: string | null
  }
  initialMenuConfig?: Record<MenuType, string[]>
}

const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }

export default function MenuManager({ terminal, initialMenuConfig = {} }: MenuManagerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<MenuType>('pos')
  const [menuConfig, setMenuConfig] = useState<Record<MenuType, string[]>>(initialMenuConfig)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Mock product data - in production, this would come from an API
  const mockProducts: Record<MenuType, MenuItem[]> = {
    pos: [
      { id: '1', name: '음료' },
      { id: '2', name: '식사' },
      { id: '3', name: '사이드' },
      { id: '4', name: '디저트' },
    ],
    kiosk: [
      { id: '1', name: '세트메뉴' },
      { id: '2', name: '단품' },
      { id: '3', name: '음료' },
    ],
    ticket_checker: [
      { id: '1', name: '식권' },
      { id: '2', name: '교환' },
    ],
    table_order: [
      { id: '1', name: '메인' },
      { id: '2', name: '음료' },
      { id: '3', name: '디저트' },
      { id: '4', name: '추가' },
    ],
  }

  const toggleProduct = (menuType: MenuType, productId: string) => {
    setMenuConfig(prev => {
      const current = prev[menuType] || []
      const updated = current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId]
      return {
        ...prev,
        [menuType]: updated,
      }
    })
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch(`/api/terminals/${terminal.id}/menu`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuConfig),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || '저장 실패')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      setTimeout(() => router.refresh(), 500)
    } catch (err) {
      setError('네트워크 오류')
      setLoading(false)
    }
  }

  const products = mockProducts[activeTab]
  const selectedProducts = menuConfig[activeTab] || []

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      {/* 헤더 */}
      <div>
        <h3 className="text-lg font-semibold text-white">메뉴 설정</h3>
        <p className="text-sm text-white/50 mt-1">
          단말기 {terminal.term_id}: {terminal.name || '미설정'}
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {(Object.entries(MENU_LABELS) as [MenuType, string][]).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === type
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-white/50 hover:text-white/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 제품 목록 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {products.length === 0 ? (
          <p className="text-white/50 text-sm py-4 text-center">
            사용 가능한 제품이 없습니다.
          </p>
        ) : (
          products.map(product => (
            <label key={product.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={selectedProducts.includes(product.id)}
                onChange={() => toggleProduct(activeTab, product.id)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
              <span className="text-sm text-white flex-1">{product.name}</span>
              {selectedProducts.includes(product.id) && (
                <span className="text-xs text-green-400 font-medium">활성</span>
              )}
            </label>
          ))
        )}
      </div>

      {/* 선택 요약 */}
      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
        <p className="text-xs text-white/70">
          {MENU_LABELS[activeTab]}: <span className="text-white font-medium">{selectedProducts.length}개</span> 활성화
        </p>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* 성공 메시지 */}
      {success && (
        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50">
          <p className="text-green-300 text-sm">메뉴 설정이 저장되었습니다.</p>
        </div>
      )}

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {loading ? '저장 중...' : '메뉴 설정 저장'}
      </button>
    </div>
  )
}
