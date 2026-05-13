'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

interface Props {
  onScan: (input: string) => void
  enabled?: boolean
  /** 정사각형 크기(px). 생략 시 부모 컨테이너를 100%로 채움 */
  size?: number
}

/**
 * ScanWaitScreen viewfinder 내부에 인라인으로 임베드되는 카메라 스캐너.
 * 전체화면 모달 없이 연속 인식. 동일 코드 2초 내 중복 방지.
 */
export default function InlineCameraScanner({ onScan, enabled = true, size }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastScannedRef = useRef<{ value: string; time: number }>({ value: '', time: 0 })
  const [status, setStatus] = useState<'starting' | 'active' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')

  const handleDecode = useCallback((text: string) => {
    const now = Date.now()
    if (text === lastScannedRef.current.value && now - lastScannedRef.current.time < 2000) return
    lastScannedRef.current = { value: text, time: now }
    onScan(text)
  }, [onScan])

  useEffect(() => {
    if (!enabled || !videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    let cancelled = false

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (cancelled) return
      if (result) {
        handleDecode(result.getText())
        setStatus('active')
      }
      if (err && !(err instanceof NotFoundException)) {
        // 프레임마다 발생하는 NotFoundException은 정상
      }
    }).then(() => {
      if (!cancelled) setStatus('active')
    }).catch((err: unknown) => {
      if (cancelled) return
      const msg = err instanceof Error ? err.message : '카메라 접근 실패'
      setErrorMsg(msg.includes('Permission') ? '카메라 권한이 필요합니다.' : msg)
      setStatus('error')
    })

    return () => {
      cancelled = true
      try {
        BrowserMultiFormatReader.releaseAllStreams()
      } catch {}
    }
  }, [enabled, handleDecode])

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        width: size ?? '100%',
        height: size ?? '100%',
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      {status === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-white/60 font-mono">카메라 시작 중...</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
          <span className="text-2xl">📷</span>
          <p className="text-[11px] text-white/80">{errorMsg}</p>
        </div>
      )}
    </div>
  )
}
