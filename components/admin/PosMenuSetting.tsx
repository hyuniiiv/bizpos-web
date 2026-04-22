'use client'
import { useState } from 'react'
import { useMenuStore } from '@/lib/store/menuStore'
import type { PosMenuItem } from '@/types/menu'

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none transition-all'
const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }

type ItemForm = Omit<PosMenuItem, 'id' | 'sortOrder'>

const emptyItemForm = (categoryId: string): ItemForm => ({
  categoryId, name: '', price: 0, description: '', isAvailable: true,
})

export default function PosMenuSetting() {
  const {
    posCategories, posMenuItems,
    addPosCategory, updatePosCategory, deletePosCategory,
    addPosMenuItem, updatePosMenuItem, deletePosMenuItem,
  } = useMenuStore()

  const [selectedCatId, setSelectedCatId] = useState<string | null>(
    posCategories[0]?.id ?? null
  )
  const [newCatName, setNewCatName] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')

  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm(selectedCatId ?? ''))

  const itemsInCat = posMenuItems.filter(m => m.categoryId === selectedCatId)

  const handleAddCategory = () => {
    const name = newCatName.trim()
    if (!name) return
    addPosCategory(name)
    setNewCatName('')
  }

  const handleSaveCategory = (id: string) => {
    if (editingCatName.trim()) updatePosCategory(id, { name: editingCatName.trim() })
    setEditingCatId(null)
  }

  const handleDeleteCategory = (id: string) => {
    if (!confirm('카테고리와 해당 카테고리의 메뉴가 모두 삭제됩니다.')) return
    deletePosCategory(id)
    if (selectedCatId === id) setSelectedCatId(posCategories.find(c => c.id !== id)?.id ?? null)
  }

  const openAddItem = () => {
    if (!selectedCatId) return
    setEditingItemId(null)
    setItemForm(emptyItemForm(selectedCatId))
    setShowItemForm(true)
  }

  const openEditItem = (item: PosMenuItem) => {
    setEditingItemId(item.id)
    setItemForm({ categoryId: item.categoryId, name: item.name, price: item.price, description: item.description ?? '', isAvailable: item.isAvailable })
    setShowItemForm(true)
  }

  const handleSaveItem = () => {
    if (!itemForm.name.trim() || itemForm.price <= 0) return
    if (editingItemId) {
      updatePosMenuItem(editingItemId, { ...itemForm, name: itemForm.name.trim() })
    } else {
      addPosMenuItem({ ...itemForm, name: itemForm.name.trim() })
    }
    setShowItemForm(false)
    setEditingItemId(null)
  }

  return (
    <div className="space-y-5">
      {/* 카테고리 관리 */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">카테고리</h3>

        <div className="flex flex-wrap gap-2 mb-1">
          {posCategories.map(cat => (
            <div key={cat.id} className="flex items-center gap-0 rounded-lg overflow-hidden"
              style={{
                background: selectedCatId === cat.id ? 'rgba(96,165,250,0.20)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${selectedCatId === cat.id ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.12)'}`,
              }}>
              {editingCatId === cat.id ? (
                <>
                  <input autoFocus value={editingCatName}
                    onChange={e => setEditingCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(cat.id); if (e.key === 'Escape') setEditingCatId(null) }}
                    className="px-2 py-1.5 text-sm text-white bg-transparent focus:outline-none w-24" />
                  <button onClick={() => handleSaveCategory(cat.id)} className="px-2 py-1.5 text-xs text-blue-400 hover:text-blue-300">저장</button>
                  <button onClick={() => setEditingCatId(null)} className="px-1.5 py-1.5 text-xs text-white/30 hover:text-white/60">✕</button>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectedCatId(cat.id)} className="px-3 py-1.5 text-sm text-white font-medium">
                    {cat.name}
                    <span className="ml-1.5 text-xs text-white/35">{posMenuItems.filter(m => m.categoryId === cat.id).length}</span>
                  </button>
                  <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }}
                    className="px-1.5 py-1.5 text-xs text-white/30 hover:text-white/60">✏</button>
                  <button onClick={() => handleDeleteCategory(cat.id)}
                    className="px-1.5 py-1.5 text-xs text-red-400/50 hover:text-red-400">✕</button>
                </>
              )}
            </div>
          ))}

          <div className="flex items-center gap-0 rounded-lg overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}>
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder="새 카테고리"
              className="px-3 py-1.5 text-sm text-white bg-transparent placeholder-white/20 focus:outline-none w-24" />
            <button onClick={handleAddCategory} className="px-2 py-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium">추가</button>
          </div>
        </div>
      </div>

      {/* 메뉴 아이템 목록 */}
      {selectedCatId ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-sm font-semibold text-white/70">
              {posCategories.find(c => c.id === selectedCatId)?.name} 메뉴
            </span>
            <button onClick={openAddItem}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: 'rgba(96,165,250,0.22)', border: '1px solid rgba(96,165,250,0.38)' }}>
              + 메뉴 추가
            </button>
          </div>

          {itemsInCat.length === 0 ? (
            <p className="px-4 py-8 text-center text-white/30 text-sm">메뉴를 추가하세요</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-white/45 font-medium">메뉴명</th>
                  <th className="px-4 py-3 text-left text-white/45 font-medium hidden sm:table-cell">설명</th>
                  <th className="px-4 py-3 text-right text-white/45 font-medium">가격</th>
                  <th className="px-4 py-3 text-center text-white/45 font-medium">상태</th>
                  <th className="px-4 py-3 text-center text-white/45 font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/05">
                {itemsInCat.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-white/40 text-xs max-w-[160px] truncate hidden sm:table-cell">{item.description || '—'}</td>
                    <td className="px-4 py-3 text-right text-white/80 font-mono tabular-nums">{item.price.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => updatePosMenuItem(item.id, { isAvailable: !item.isAvailable })}
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          color: item.isAvailable ? 'rgba(34,197,94,0.90)' : 'rgba(255,255,255,0.30)',
                          background: item.isAvailable ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                        }}>
                        {item.isAvailable ? '판매중' : '품절'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openEditItem(item)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">수정</button>
                        <button onClick={() => deletePosMenuItem(item.id)} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="rounded-xl px-6 py-10 text-center text-white/25"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.10)' }}>
          카테고리를 먼저 추가하세요
        </div>
      )}

      {/* 메뉴 추가/수정 모달 */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-white mb-4">{editingItemId ? '메뉴 수정' : '메뉴 추가'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">메뉴명 *</label>
                <input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="김치찌개" autoFocus />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">가격 (원) *</label>
                <input type="number" value={itemForm.price || ''} min={0}
                  onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))}
                  className={inputCls} style={inputStyle} placeholder="8000" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">설명 (선택)</label>
                <input value={itemForm.description ?? ''} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="간단한 메뉴 설명" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={itemForm.isAvailable}
                  onChange={e => setItemForm(f => ({ ...f, isAvailable: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-400" />
                <span className="text-sm text-white/70">판매 가능</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowItemForm(false); setEditingItemId(null) }}
                className="flex-1 py-2.5 rounded-lg text-sm text-white/50 hover:text-white/70 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}>취소</button>
              <button onClick={handleSaveItem}
                disabled={!itemForm.name.trim() || itemForm.price <= 0}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
                style={{ background: 'rgba(96,165,250,0.30)', border: '1px solid rgba(96,165,250,0.50)' }}>
                {editingItemId ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
