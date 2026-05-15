/**
 * 원격 명령 리스너
 * admin 대시보드에서 terminal_commands 테이블에 INSERT → 단말기가 폴링으로 수신 → 실행 → 결과 PATCH
 *
 * Realtime 대신 폴링 사용: anon Supabase 클라이언트는 terminal_commands SELECT RLS를 통과하지 못함
 */
'use client'

import { flushOfflineQueue } from '@/lib/txSync'
import { getServerUrl } from '@/lib/serverUrl'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { PaymentRepository } from '@/lib/repository/payment.repository'

const POLL_INTERVAL_MS = 4000

async function uploadToServer(
  kind: 'log' | 'screenshot',
  base64: string,
): Promise<{ result?: unknown; error?: string }> {
  const token = useSettingsStore.getState().deviceToken
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

export type RemoteCommand = 'restart' | 'flush_queue' | 'upload_log' | 'screenshot' | 'reconnect'

interface CommandRow {
  id: string
  command: RemoteCommand
  args: Record<string, unknown> | null
}

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
        try {
          const remaining = await PaymentRepository.getPendingPayments()
          useSettingsStore.getState().setPendingCount(remaining.length)
        } catch { /* UI 갱신 실패는 무시 */ }
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

async function handleCommand(cmd: CommandRow, token: string): Promise<void> {
  const base = getServerUrl() + '/api/device/commands'
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // 수신 확인
  await fetch(base, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ id: cmd.id, received_at: new Date().toISOString() }),
  }).catch(() => {})

  const { result, error } = await executeCommand(cmd)

  await fetch(base, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      id: cmd.id,
      executed_at: new Date().toISOString(),
      result: result ?? null,
      error: error ?? null,
    }),
  }).catch(() => {})

  // 결과 기록 후 실제 재시작 (돌아올 수 없는 명령은 맨 마지막)
  if (cmd.command === 'restart' && !error) {
    const electron = (globalThis as unknown as { electronAPI?: { relaunchApp?: () => Promise<void> } }).electronAPI
    setTimeout(() => { void electron?.relaunchApp?.() }, 500)
  }
}

let pollTimer: ReturnType<typeof setTimeout> | null = null
let polling = false

export function startRemoteCommandListener(terminalId: string): () => void {
  if (!terminalId) return () => {}
  if (polling) return () => {}

  polling = true

  const tick = async () => {
    if (!polling) return

    const token = useSettingsStore.getState().deviceToken
    if (!token || token === 'manual') {
      pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
      return
    }

    try {
      const res = await fetch(getServerUrl() + '/api/device/commands', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.command) {
          await handleCommand(data.command as CommandRow, token)
        }
      }
    } catch {
      // 네트워크 오류는 무시하고 다음 폴링 대기
    }

    if (polling) {
      pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
    }
  }

  void tick()

  return () => {
    polling = false
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }
}
