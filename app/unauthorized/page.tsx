export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--pos-bg-gradient)' }}>
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: '#06D6A0' }}>
            <span className="text-black font-black text-base leading-none">B</span>
          </div>
          <span className="text-3xl font-black tracking-tight text-white">BIZPOS</span>
        </div>
        <div className="bp-card rounded-2xl p-8">
          <h1 className="text-lg font-bold text-white mb-2">접근 권한 없음</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--bp-text-3)' }}>
            이 계정은 어떤 포털에도 소속되어 있지 않습니다.<br />
            관리자에게 문의하세요.
          </p>
          <a
            href="/login"
            className="inline-block w-full py-2.5 rounded-lg text-sm font-semibold text-black text-center"
            style={{ background: '#06D6A0' }}
          >
            로그인 페이지로
          </a>
        </div>
      </div>
    </div>
  )
}
