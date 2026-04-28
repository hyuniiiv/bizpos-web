import type { Metadata } from 'next'
import RemoteCommandListener from '@/components/pos/RemoteCommandListener'

export const metadata: Metadata = {
  title: 'BIZPOS - 식권 체크기',
  description: '비플식권 결제 POS',
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: 'var(--pos-bg-gradient)', fontFamily: 'system-ui, sans-serif' }}
    >
      <RemoteCommandListener />
      <div className="w-full h-full flex flex-col">
        {children}
      </div>
    </div>
  )
}
