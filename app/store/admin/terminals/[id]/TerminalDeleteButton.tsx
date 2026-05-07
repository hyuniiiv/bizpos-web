'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal'

export default function TerminalDeleteButton({ terminalId, terminalName }: { terminalId: string; terminalName: string }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const handleDelete = async () => {
    const res = await fetch(`/api/terminals/${terminalId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? '삭제 실패')
    router.push('/store/admin/terminals')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-400 transition-opacity hover:opacity-80"
        style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)' }}
      >
        <Trash2 className="w-4 h-4" />
        삭제
      </button>
      {showModal && (
        <DeleteConfirmModal
          title={`'${terminalName}' 단말기 삭제`}
          description="단말기가 삭제됩니다. 거래내역은 보존됩니다."
          onConfirm={handleDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
