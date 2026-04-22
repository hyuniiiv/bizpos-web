'use client'
import Link from 'next/link'
import { useSettingsStore } from '@/lib/store/settingsStore'

interface Props {
  mode?: string
  lastMessage?: string
  lastOrderId?: string
}

export default function StatusBar({ mode, lastMessage, lastOrderId }: Props) {
  const { config, isOnline, pendingOfflineCount } = useSettingsStore()

  return (
    <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-white/40 border-t border-white/10"
         style={{ background: 'rgba(5, 14, 31, 0.50)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-2">
        {/* 관리자 설정 진입 */}
        <Link href="/pos/admin" className="font-mono hover:text-white transition-colors">
          {config.termId ? `[${config.termId}]` : '[--]'}
        </Link>
        {!isOnline && (
          <span className="text-orange-400 font-semibold">
            ⚠ 오프라인 {pendingOfflineCount > 0 ? `미동기화: ${pendingOfflineCount}건` : ''}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {lastMessage && <span className="text-green-400">{lastMessage}</span>}
        {lastOrderId && <span className="text-white/25 font-mono">{lastOrderId}</span>}
        {/* 바코드 리더 타입 인디케이터 */}
        <span className="text-white/30">
          {config.barcodeReaderType === 'camera' ? '📷' :
           config.barcodeReaderType === 'serial' ? '🔌COM' : '⌨️HID'}
        </span>
        {/* 온/오프라인 인디케이터 */}
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
    </div>
  )
}
