/**
 * 원격 명령 리스너
 * admin 대시보드에서 terminal_commands 테이블에 INSERT → 단말기가 Realtime 수신 → 실행 → 결과 UPDATE
 */
'use client'

import { getBrowserClient } from '@/lib/supabase/browser'
import { flushOfflineQueue } from '@/lib/txSync'
import { getServerUrl } from '@/lib/serverUrl'
import type { RealtimeChannel } from '@supabase/supabase-js'

const ACCESS_TOKEN_KEY = 'terminal_access_token'

async function uploadToServer(
  kind: 'log' | 'screenshot',
  base64: string,
): Promise<{ result?: unknown; error?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null
  if (!token) return { error: 'NO_ACCESS_TOKEN' }

  try {
    const res = await fetch(getServerUrl() + '/api/device/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, base64 }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error ?? `HTTP_${res.status}` }
    return { result: { path: data.path, signedUrl: data.signedUrl, bucket: data.bucket, size: data.size } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'FETCH_FAILED' }
  }
}

const TERMINAL_ID_KEY = 'terminal_id'

export type RemoteCommand = 'restart' | 'flush_queue' | 'upload_log' | 'screenshot' | 'reconnect'

interface CommandRow {
  id: string
  terminal_id: string
  command: RemoteCommand
  args: Record<string, unknown> | null
  executed_at: string | null
}

let channel: RealtimeChannel | null = null

async function executeCommand(cmd: CommandRow): Promise<{ result?: unknown; error?: string }> {
  const electron = (globalThis as unknown as {
    electronAPI?: {
      relaunchApp?: () => Promise<void>
      getLogContents?: () => Promise<{ success: boolean; base64?: string; filename?: string; size?: number; error?: string }>
      captureScreenshot?: () => Promise<{ success: boolean; base64?: string; size?: number; error?: string }>
    }
  }).electronAPI

  switch (cmd.command) {
    case 'restart':
      if (!electron?.relaunchApp) return { error: 'NOT_ELECTRON_ENVIRONMENT' }
      return { result: { ok: true, note: 'relaunch scheduled' } }
    case 'flush_queue': {
      try {
        const r = await flushOfflineQueue()
        return { result: r }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'FLUSH_FAILED' }
      }
    }
    case 'reconnect':
      setTimeout(() => { if (typeof window !== 'undefined') window.location.reload() }, 500)
      return { result: { ok: true, note: 'reload scheduled' } }
    case 'upload_log': {
      if (!electron?.getLogContents) return { error: 'NOT_ELECTRON_ENVIRONMENT' }
      const r = await electron.getLogContents()
      if (!r.success || !r.base64) return { error: r.error ?? 'NO_LOG' }
      return uploadToServer('log', r.base64)
    }
    case 'screenshot': {
      if (!electron?.captureScreenshot) return { error: 'NOT_ELECTRON_ENVIRONMENT' }
      const r = await electron.captureScreenshot()
      if (!r.success || !r.base64) return { error: r.error ?? 'CAPTURE_FAILED' }
      return uploadToServer('screenshot', r.base64)
    }
    default:
      return { error: 'UNKNOWN_COMMAND' }
  }
}

async function handleCommand(cmd: CommandRow): Promise<void> {
  const supabase = getBrowserClient()

  await supabase
    .from('terminal_commands')
    .update({ received_at: new Date().toISOString() })
    .eq('id', cmd.id)

  const { result, error } = await executeCommand(cmd)

  await supabase
    .from('terminal_commands')
    .update({
      executed_at: new Date().toISOString(),
      result: result ?? null,
      error: error ?? null,
    })
    .eq('id', cmd.id)

  // 결과 기록 후 실제 재시작 (돌아올 수 없는 명령은 맨 마지막)
  if (cmd.command === 'restart' && !error) {
    const electron = (globalThis as unknown as { electronAPI?: { relaunchApp?: () => Promise<void> } }).electronAPI
    setTimeout(() => { void electron?.relaunchApp?.() }, 500)
  }
}

export function startRemoteCommandListener(): () => void {
  if (channel) return () => {}
  const terminalId = typeof window !== 'undefined' ? localStorage.getItem(TERMINAL_ID_KEY) : null
  if (!terminalId) return () => {}

  const supabase = getBrowserClient()

  channel = supabase
    .channel(`terminal-commands-${terminalId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'terminal_commands',
        filter: `terminal_id=eq.${terminalId}`,
      },
      (payload) => {
        const row = payload.new as CommandRow
        if (row.executed_at) return
        void handleCommand(row)
      },
    )
    .subscribe()

  return () => {
    if (channel) {
      void supabase.removeChannel(channel)
      channel = null
    }
  }
}
