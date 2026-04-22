import type { Metadata } from 'next'
import { AdminSidebar, AdminMobileNav } from '@/components/admin/AdminNav'

export const metadata: Metadata = {
  title: 'BIZPOS 관리자',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--pos-bg-gradient)', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* 헤더 */}
      <header
        className="flex-shrink-0 border-b border-white/10 px-4 md:px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(5, 14, 31, 0.60)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black tracking-tight text-white">BIZPOS</h1>
          <span className="text-white/40 text-base hidden sm:inline">관리 콘솔</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/50 text-sm">LIVE</span>
          <span className="text-white/35 text-sm ml-2 hidden sm:inline">
            {new Date().toLocaleDateString('ko-KR')}
          </span>
        </div>
      </header>

      {/* 모바일: 수평 스크롤 네비 */}
      <AdminMobileNav />

      {/* 바디: 사이드바 + 콘텐츠 */}
      <div className="flex flex-1 min-h-0">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-auto p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
