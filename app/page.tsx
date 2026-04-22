import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
         style={{ background: 'var(--pos-bg-gradient)', fontFamily: 'system-ui, sans-serif' }}>
      <div className="text-center text-white mb-10">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-3 drop-shadow-lg">BIZPOS</h1>
        <p className="text-white/50 text-base sm:text-lg">비플식권 결제 연동 웹 POS</p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-xs sm:max-w-sm">
        <Link href="/pos"
          className="block text-center py-5 px-8 glass-strong rounded-2xl font-bold text-lg text-white hover:bg-white/20 transition-all active:scale-95">
          POS 화면 시작
          <p className="text-xs text-white/45 font-normal mt-0.5">식권 체크기 모드</p>
        </Link>
        <Link href="/admin"
          className="block text-center py-5 px-8 glass-card rounded-2xl font-semibold text-lg text-white hover:bg-white/15 transition-all active:scale-95">
          관리자 콘솔
          <p className="text-xs text-white/40 font-normal mt-0.5">실시간 거래관리</p>
        </Link>
        <Link href="/store/admin"
          className="block text-center py-4 px-8 rounded-2xl font-medium text-sm text-white/50 hover:text-white/80 transition-colors">
          대시보드 →
        </Link>
      </div>
      <div className="mt-12 text-white/25 text-xs text-center space-y-1">
        <p>비플페이 PG API v1.7 연동</p>
        <p>PC · 키오스크 · 태블릿 · 모바일 지원</p>
      </div>
    </div>
  )
}
