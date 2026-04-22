'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelTransaction } from './actions'

interface Props {
  merchantOrderID: string
  tid: string
  amount: number
  menuName: string
  termId: string
}

export function CancelButton({ merchantOrderID, tid, amount, menuName, termId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const handleClick = () => {
    if (!confirm(`거래번호 ${merchantOrderID} 를 취소하시겠습니까?`)) return
    startTransition(async () => {
      const res = await cancelTransaction({ merchantOrderID, tid, amount, menuName, termId })
      if (res.code === '0000') {
        setDone(true)
        router.refresh()
      } else {
        alert(`취소 실패: ${res.msg}`)
      }
    })
  }

  if (done) return <span className="text-xs text-white/40">취소됨</span>

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="px-3 py-1 rounded text-xs font-medium text-white transition-all disabled:opacity-40"
      style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.45)' }}
    >
      {pending ? '처리 중...' : '취소'}
    </button>
  )
}
