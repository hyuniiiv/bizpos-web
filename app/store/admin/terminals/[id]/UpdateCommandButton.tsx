'use client'

import { useState } from 'react'
import { requestTerminalUpdate } from './actions'

export function UpdateCommandButton({ terminalId }: { terminalId: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleClick = async () => {
    if (!confirm('이 단말기에 업데이트를 지시하시겠습니까?\n단말기가 온라인 상태일 때 자동으로 업데이트가 시작됩니다.')) return
    setStatus('sending')
    try {
      await requestTerminalUpdate(terminalId)
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 4000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const label = { idle: '업데이트 지시', sending: '전송 중...', sent: '✓ 지시 완료', error: '오류 발생' }[status]
  const bg = { idle: 'rgba(96,165,250,0.20)', sending: 'rgba(96,165,250,0.10)', sent: 'rgba(74,222,128,0.20)', error: 'rgba(239,68,68,0.20)' }[status]
  const border = { idle: 'rgba(96,165,250,0.40)', sending: 'rgba(96,165,250,0.20)', sent: 'rgba(74,222,128,0.40)', error: 'rgba(239,68,68,0.40)' }[status]

  return (
    <button
      onClick={handleClick}
      disabled={status === 'sending'}
      className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {label}
    </button>
  )
}
