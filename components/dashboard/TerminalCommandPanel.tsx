'use client'

import { useEffect, useRef, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'

type Command = 'restart' | 'flush_queue' | 'upload_log' | 'screenshot' | 'reconnect'

const COMMANDS: { key: Command; label: string; desc: string }[] = [
  { key: 'restart',     label: '앱 재시작',       desc: '단말기 앱을 재시작합니다' },
  { key: 'reconnect',   label: '서버 재연결',      desc: 'SSE 서버 연결을 재시도합니다' },
  { key: 'flush_queue', label: '오프라인 큐 전송', desc: '미전송 오프라인 거래를 즉시 동기화합니다' },
  { key: 'upload_log',  label: '로그 업로드',      desc: '실행 로그를 서버에 업로드합니다' },
  { key: 'screenshot',  label: '스크린샷',         desc: '현재 화면을 캡처합니다' },
]

interface CommandResult {
  id: string
  command: Command
  executed_at: string | null
  result: { signedUrl?: string; synced?: number; failed?: number } | null
  error: string | null
}

export default function TerminalCommandPanel({ terminalId, online }: { terminalId: string; online: boolean }) {
  const [busy, setBusy] = useState<Command | null>(null)
  const [pending, setPending] = useState<{ id: string; command: Command } | null>(null)
  const [lastResult, setLastResult] = useState<CommandResult | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
        return
      }
      if (Date.now() - startedAt > 30_000) {
        setErrMsg('응답 지연 (30초 초과)')
        setPending(null)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }

    pollRef.current = setInterval(tick, 2000)
    void tick()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pending])

  const send = async (cmd: Command) => {
    setBusy(cmd)
    setErrMsg('')
    setLastResult(null)
    try {
      const supabase = getBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('terminal_commands')
        .insert({ terminal_id: terminalId, command: cmd, created_by: user?.id ?? null })
        .select('id')
        .single()
      if (error || !data) setErrMsg(`실패: ${error?.message ?? 'NO_RESULT'}`)
      else setPending({ id: data.id, command: cmd })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      {!online && (
        <p className="text-xs text-white/40 text-center py-1">오프라인 — 명령 전송 불가</p>
      )}
      {COMMANDS.map(c => {
        const isRunning = busy === c.key || pending?.command === c.key
        const isDone = lastResult?.command === c.key
        return (
          <div key={c.key}>
            <button
              onClick={() => send(c.key)}
              disabled={!online || busy !== null || pending !== null}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all disabled:opacity-40"
              style={{
                background: isDone && !lastResult?.error ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isDone && !lastResult?.error ? 'rgba(74,222,128,0.30)' : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/80">{c.label}</span>
                {isRunning && <span className="text-xs text-blue-300 animate-pulse">실행 중...</span>}
                {isDone && !lastResult?.error && <span className="text-xs text-green-400">✓ 완료</span>}
                {isDone && lastResult?.error && <span className="text-xs text-red-400">실패</span>}
              </div>
              <p className="text-xs text-white/40 mt-0.5">{c.desc}</p>
            </button>
            {isDone && lastResult?.command === 'flush_queue' && lastResult.result && (
              <p className="text-xs text-white/50 px-3 mt-1">
                동기화 <span className="text-green-400">{lastResult.result.synced ?? 0}건</span>
                {(lastResult.result.failed ?? 0) > 0 && <span className="text-red-400"> · 실패 {lastResult.result.failed}건</span>}
              </p>
            )}
            {isDone && lastResult?.command === 'upload_log' && lastResult.result?.signedUrl && (
              <a href={lastResult.result.signedUrl} target="_blank" rel="noopener noreferrer"
                className="block text-xs text-blue-400 hover:underline px-3 mt-1">로그 다운로드 (24h)</a>
            )}
            {isDone && lastResult?.command === 'screenshot' && lastResult.result?.signedUrl && (
              <a href={lastResult.result.signedUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 px-3">
                <img src={lastResult.result.signedUrl} alt="screenshot" className="rounded border border-white/10 w-full" />
              </a>
            )}
          </div>
        )
      })}
      {errMsg && <p className="text-xs text-red-300 px-1">{errMsg}</p>}
    </div>
  )
}
