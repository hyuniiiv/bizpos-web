'use client'

import { useEffect, useRef, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'

type Command = 'restart' | 'flush_queue' | 'upload_log' | 'screenshot' | 'reconnect'

const COMMANDS: { key: Command; label: string; emoji: string; enabled: boolean }[] = [
  { key: 'restart',     label: '앱 재시작',        emoji: '🔄', enabled: true },
  { key: 'flush_queue', label: '오프라인 큐 전송', emoji: '📤', enabled: true },
  { key: 'reconnect',   label: '서버 재연결',      emoji: '🔌', enabled: true },
  { key: 'upload_log',  label: '로그 업로드',      emoji: '📄', enabled: true },
  { key: 'screenshot',  label: '스크린샷',         emoji: '📸', enabled: true },
]

interface CommandResult {
  id: string
  command: Command
  executed_at: string | null
  result: { path?: string; signedUrl?: string; synced?: number; failed?: number; ok?: boolean; note?: string } | null
  error: string | null
}

export default function TerminalCommandMenu({ terminalId, online }: { terminalId: string; online: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<Command | null>(null)
  const [pending, setPending] = useState<{ id: string; command: Command } | null>(null)
  const [lastResult, setLastResult] = useState<CommandResult | null>(null)
  const [errMsg, setErrMsg] = useState<string>('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 결과 폴링 (2초 주기, 30초 후 포기)
  useEffect(() => {
    if (!pending) return
    const supabase = getBrowserClient()
    const startedAt = Date.now()

    const tick = async () => {
      const { data } = await supabase
        .from('terminal_commands')
        .select('id, command, executed_at, result, error')
        .eq('id', pending.id)
        .single()

      if (data?.executed_at) {
        setLastResult(data as CommandResult)
        setPending(null)
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        return
      }
      if (Date.now() - startedAt > 30_000) {
        setErrMsg('응답 지연 (30초 초과) — 나중에 SQL로 확인')
        setPending(null)
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    pollRef.current = setInterval(tick, 2000)
    void tick()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [pending])

  async function send(cmd: Command) {
    setBusy(cmd)
    setErrMsg('')
    setLastResult(null)
    try {
      const supabase = getBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('terminal_commands')
        .insert({
          terminal_id: terminalId,
          command: cmd,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single()

      if (error || !data) {
        setErrMsg(`실패: ${error?.message ?? 'NO_RESULT'}`)
      } else {
        setPending({ id: data.id, command: cmd })
      }
    } finally {
      setBusy(null)
    }
  }

  function close() {
    setOpen(false)
    setPending(null)
    setLastResult(null)
    setErrMsg('')
    if (pollRef.current) clearInterval(pollRef.current)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        disabled={!online}
        title={online ? '원격 명령' : '오프라인 상태 — 명령 전송 불가'}
        className="px-2 py-1 rounded text-xs transition-colors disabled:opacity-30"
        style={{ background: 'rgba(96,165,250,0.15)', color: 'rgba(147,197,253,0.9)' }}
      >
        ⚡
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 mt-1 z-20 min-w-[240px] rounded-lg overflow-hidden"
               style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}>
            {COMMANDS.map(c => (
              <button key={c.key}
                onClick={() => c.enabled && send(c.key)}
                disabled={!c.enabled || busy !== null || pending !== null}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 disabled:opacity-30 hover:bg-white/5 transition-colors"
              >
                <span>{c.emoji}</span>
                <span className="flex-1 text-white/80">{c.label}</span>
                {busy === c.key && <span className="text-[9px] text-blue-300">전송중</span>}
                {pending?.command === c.key && <span className="text-[9px] text-yellow-300">실행 대기...</span>}
              </button>
            ))}

            {errMsg && (
              <div className="px-3 py-2 text-[10px] border-t border-white/10 text-red-300/90">{errMsg}</div>
            )}

            {pending && (
              <div className="px-3 py-2 text-[10px] border-t border-white/10 text-blue-300/90">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  단말기 응답 대기 중...
                </div>
              </div>
            )}

            {lastResult && <ResultView result={lastResult} onClose={close} />}
          </div>
        </>
      )}
    </div>
  )
}

function ResultView({ result, onClose }: { result: CommandResult; onClose: () => void }) {
  const isError = !!result.error
  const r = result.result

  return (
    <div className="px-3 py-2 text-[10px] border-t border-white/10 space-y-1.5">
      {isError ? (
        <div className="text-red-300/90">❌ {result.error}</div>
      ) : (
        <div className="text-green-300/90">✅ 실행 완료</div>
      )}

      {/* 명령별 커스텀 결과 */}
      {result.command === 'flush_queue' && r && (
        <div className="text-white/60">
          동기화: <span className="text-green-300">{r.synced ?? 0}</span> ·
          실패: <span className={r.failed ? 'text-red-300' : 'text-white/40'}> {r.failed ?? 0}</span>
        </div>
      )}

      {result.command === 'upload_log' && r?.signedUrl && (
        <a href={r.signedUrl} target="_blank" rel="noopener noreferrer"
           className="inline-block px-2 py-1 rounded text-blue-300 hover:bg-white/5"
           style={{ background: 'rgba(59,130,246,0.12)' }}>
          📥 로그 파일 다운로드 (24h 유효)
        </a>
      )}

      {result.command === 'screenshot' && r?.signedUrl && (
        <div className="space-y-1">
          <a href={r.signedUrl} target="_blank" rel="noopener noreferrer">
            <img src={r.signedUrl} alt="screenshot" className="rounded border border-white/10 max-w-full" />
          </a>
          <a href={r.signedUrl} target="_blank" rel="noopener noreferrer"
             className="text-blue-300 hover:underline">원본 열기 (24h 유효)</a>
        </div>
      )}

      <button onClick={onClose}
        className="w-full mt-1 px-2 py-1 text-[10px] text-white/40 hover:text-white/70 transition-colors">
        닫기
      </button>
    </div>
  )
}
