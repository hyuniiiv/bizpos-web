'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

interface Props {
  onScan: (input: string) => void
  onClose: () => void
}

/**
 * 카메라 기반 바코드/QR 스캐너
 * - BrowserMultiFormatReader: QR, Code128, EAN-13/8, DataMatrix 등 지원
 * - 2초 내 동일 코드 중복 방지
 * - 스캔 성공 시 진동 피드백 (모바일)
 */
export default function CameraReader({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const lastScannedRef = useRef<{ value: string; time: number }>({ value: '', time: 0 })
  const [status, setStatus] = useState<'starting' | 'active' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')

  const handleDecode = useCallback((text: string) => {
    const now = Date.now()
    // 2초 내 동일 코드 무시
    if (text === lastScannedRef.current.value && now - lastScannedRef.current.time < 2000) return
    lastScannedRef.current = { value: text, time: now }

    // 진동 피드백 (모바일)
    if (navigator.vibrate) navigator.vibrate(80)

    onScan(text)
    onClose()
  }, [onScan, onClose])

  useEffect(() => {
    if (!videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    codeReaderRef.current = reader

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (result) {
        handleDecode(result.getText())
        setStatus('active')
      }
      if (err && !(err instanceof NotFoundException)) {
        // NotFoundException은 프레임마다 발생하는 정상 케이스
      }
    }).then(() => {
      setStatus('active')
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : '카메라 접근 실패'
      setErrorMsg(msg.includes('Permission') ? '카메라 권한이 필요합니다.' : msg)
      setStatus('error')
    })

    return () => {
      try {
        BrowserMultiFormatReader.releaseAllStreams()
      } catch {}
    }
  }, [handleDecode])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">📷 카메라 스캔</span>
          {status === 'active' && (
            <span className="text-xs text-green-400 animate-pulse">● 인식 중</span>
          )}
          {status === 'starting' && (
            <span className="text-xs text-yellow-400">● 시작 중...</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white text-2xl leading-none px-2"
        >
          ✕
        </button>
      </div>

      {/* 카메라 뷰 */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* 스캔 영역 오버레이 */}
        {status === 'active' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* 주변 어둡게 */}
            <div className="absolute inset-0 bg-black/30" />

            {/* 스캔 박스 */}
            <div className="relative w-64 h-64">
              {/* 모서리 가이드 */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1B2A6B] rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1B2A6B] rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1B2A6B] rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1B2A6B] rounded-br-sm" />

              {/* 스캔 라인 애니메이션 */}
              <div className="absolute left-2 right-2 h-0.5 bg-[#1B2A6B]/80 shadow-[0_0_6px_2px_rgba(27,42,107,0.5)] animate-scan-line" />
            </div>

            <p className="absolute bottom-20 text-white/80 text-xs text-center">
              바코드 또는 QR코드를 박스 안에 맞춰 주세요
            </p>
          </div>
        )}

        {/* 에러 상태 */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70">
            <span className="text-4xl">📷</span>
            <p className="text-white text-center text-sm px-8">{errorMsg}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
