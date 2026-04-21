// components/pos/WarnScreen.tsx
'use client'
import { useEffect, useState } from 'react'

interface Props {
  message: string
  onDone: () => void
  autoPassSeconds?: number
}

export default function WarnScreen({ message, onDone, autoPassSeconds = 5 }: Props) {
  const [remaining, setRemaining] = useState(autoPassSeconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(interval)
          onDone()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-yellow-950">
      <div className="text-8xl text-yellow-400 mb-6">⚠</div>
      <p className="text-2xl font-bold text-yellow-200 text-center px-8">{message}</p>
      <p className="text-lg text-yellow-500 mt-6">{remaining}초 후 자동 통과</p>
    </div>
  )
}
