'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// CameraReader는 브라우저 전용 (SSR 비활성화)
const CameraReader = dynamic(() => import('./CameraReader'), { ssr: false })

// SerialPort / Serial / Navigator.serial 전역 타입은
// lib/device/serial.ts 의 declare global 에서 선언됨.
// 중복 선언 없이 그대로 참조한다.

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  onScan: (input: string) => void
  enabled?: boolean
  readerType?: 'keyboard' | 'serial' | 'camera'
  /** Web Serial API에서는 미사용 (requestPort로 선택). 향후 확장용 */
  serialPort?: string
}

/**
 * 바코드/QR 스캐너 입력 처리기
 *
 * - readerType === 'keyboard' (기본)
 *   USB HID 키보드 에뮬레이션 방식. 150ms 내 연속 keydown 후 Enter로 인식.
 *
 * - readerType === 'serial'
 *   Web Serial API를 사용해 시리얼 포트에서 줄 단위로 읽음.
 *   navigator.serial 미지원 환경에서는 keyboard 모드로 자동 폴백.
 */
export default function BarcodeReader({
  onScan,
  enabled = true,
  readerType = 'keyboard',
  serialPort: _serialPort,
}: Props) {
  // -------------------------------------------------------------------------
  // Keyboard 모드 refs
  // -------------------------------------------------------------------------
  const bufferRef = useRef('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeyTimeRef = useRef(0)

  // -------------------------------------------------------------------------
  // Serial 모드 refs / state
  // -------------------------------------------------------------------------
  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null)
  const [serialConnected, setSerialConnected] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  // -------------------------------------------------------------------------
  // 실제로 사용할 모드 결정 (serial 요청이지만 미지원이면 keyboard 폴백)
  // -------------------------------------------------------------------------
  const serialSupported =
    typeof navigator !== 'undefined' && 'serial' in navigator
  const effectiveType =
    readerType === 'serial' && !serialSupported ? 'keyboard' : readerType

  // -------------------------------------------------------------------------
  // Serial 모드: 미지원 경고 (마운트 시 1회)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (readerType === 'serial' && !serialSupported) {
      console.warn(
        '[BarcodeReader] Web Serial API가 지원되지 않는 환경입니다. keyboard 모드로 폴백합니다.'
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // Keyboard 모드 effect
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (effectiveType !== 'keyboard') return
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const now = Date.now()

      if (e.key === 'Enter') {
        const input = bufferRef.current.trim()
        if (input.length >= 8) {
          onScan(input)
        }
        bufferRef.current = ''
        if (timerRef.current) clearTimeout(timerRef.current)
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
        lastKeyTimeRef.current = now

        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          bufferRef.current = ''
        }, 150)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onScan, enabled, effectiveType])

  // -------------------------------------------------------------------------
  // Serial cleanup effect
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          if (readerRef.current) {
            await readerRef.current.cancel()
            readerRef.current = null
          }
          if (portRef.current) {
            await portRef.current.close()
            portRef.current = null
          }
        } catch {
          // 이미 닫혀있는 경우 무시
        }
      }
      cleanup()
    }
  }, [])

  // -------------------------------------------------------------------------
  // Serial 연결 핸들러
  // -------------------------------------------------------------------------
  const handleConnect = async () => {
    if (!serialSupported) return

    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })
      portRef.current = port

      if (!port.readable) {
        console.warn('[BarcodeReader] 포트 readable 스트림을 열 수 없습니다.')
        return
      }

      const textDecoder = new TextDecoderStream()
      port.readable.pipeTo(textDecoder.writable as WritableStream<Uint8Array>).catch(() => {
        // 연결 해제 시 발생하는 에러는 무시
      })

      const reader = textDecoder.readable.getReader()
      readerRef.current = reader
      setSerialConnected(true)

      // 줄 단위 파싱 루프
      let lineBuffer = ''
      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            lineBuffer += value

            // CR, LF, CRLF 구분자로 분리
            const lines = lineBuffer.split(/\r\n|\r|\n/)
            // 마지막 요소는 아직 완성되지 않은 조각
            lineBuffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (trimmed.length >= 8) {
                onScan(trimmed)
              }
            }
          }
        } catch {
          // reader.cancel() 호출 시 정상 종료
        } finally {
          setSerialConnected(false)
        }
      }

      readLoop()
    } catch (err) {
      console.error('[BarcodeReader] 시리얼 포트 연결 실패:', err)
    }
  }

  // -------------------------------------------------------------------------
  // 렌더
  // -------------------------------------------------------------------------
  if (enabled && effectiveType === 'camera') {
    return (
      <>
        {!cameraOpen && (
          <button
            onClick={() => setCameraOpen(true)}
            className="fixed bottom-4 right-4 rounded-md bg-[#1B2A6B] px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-[#2a3d8f] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            📷 카메라 스캔
          </button>
        )}
        {cameraOpen && (
          <CameraReader
            onScan={(val) => { onScan(val); setCameraOpen(false) }}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </>
    )
  }

  if (enabled && effectiveType === 'serial' && !serialConnected) {
    return (
      <button
        onClick={handleConnect}
        className="fixed bottom-4 right-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        시리얼 연결
      </button>
    )
  }

  return null
}
