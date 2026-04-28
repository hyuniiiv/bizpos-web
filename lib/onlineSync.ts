/**
 * 온라인 동기화 통합 레이어
 * - 단말기 활성화 코드 입력 → JWT 발급 → 설정 동기화 시작
 * - 거래 발생 시 서버 저장 (saveTransaction 래퍼)
 * - 온라인 복귀 시 오프라인 큐 자동 플러시
 */

import { startConfigPolling, stopConfigPolling } from './configSync'
import { flushOfflineQueue } from './txSync'
import { getServerUrl } from '@/lib/serverUrl'
import { useSettingsStore } from '@/lib/store/settingsStore'

const ACCESS_TOKEN_KEY = 'terminal_access_token'
const TERMINAL_ID_KEY = 'terminal_id'
const MERCHANT_ID_KEY = 'merchant_id'

export type OnlineSyncStatus = 'need_activation' | 'online' | 'offline'

let heartbeatTimer: ReturnType<typeof setInterval> | null = null

/**
 * 단말기 활성화 코드로 서버에 등록 → JWT 발급
 */
export async function activateTerminal(activationCode: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const res = await fetch(getServerUrl() + '/api/device/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activationCode }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error }
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
    localStorage.setItem(TERMINAL_ID_KEY, data.terminalId)
    localStorage.setItem(MERCHANT_ID_KEY, data.merchantId)

    return { success: true }
  } catch {
    return { success: false, error: 'NETWORK_ERROR' }
  }
}

/**
 * 온라인 동기화 초기화 (앱 시작 시 호출)
 * @param onConfigChanged 설정 변경 콜백
 */
export async function initOnlineSync(
  onConfigChanged: (config: Record<string, unknown>) => void
): Promise<OnlineSyncStatus> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)

  if (!token) return 'need_activation'

  if (!navigator.onLine) {
    // 오프라인 이벤트 리스너 등록
    window.addEventListener('online', () => handleOnlineEvent(onConfigChanged), { once: true })
    return 'offline'
  }

  await startSync(token, onConfigChanged)
  return 'online'
}

async function startSync(token: string, onConfigChanged: (config: Record<string, unknown>) => void) {
  startConfigPolling(onConfigChanged, token)

  // 오프라인 큐 플러시
  const result = await flushOfflineQueue()

  // Heartbeat 시작 (30초)
  startHeartbeat()
}

async function handleOnlineEvent(onConfigChanged: (config: Record<string, unknown>) => void) {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (!token) return
  await startSync(token, onConfigChanged)
  // 이후 오프라인 시 재등록
  window.addEventListener('offline', () => {
    stopHeartbeat()
    window.addEventListener('online', () => handleOnlineEvent(onConfigChanged), { once: true })
  }, { once: true })
}

function startHeartbeat() {
  if (heartbeatTimer) return

  const send = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token || !navigator.onLine) return

    try {
      const res = await fetch(getServerUrl() + '/api/device/heartbeat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'online' }),
      })

      if (res.ok) {
        const data = await res.json()
        // 만료 24시간 전이면 자동 갱신
        if (data.tokenExpiresAt) {
          const expiresAt = new Date(data.tokenExpiresAt).getTime()
          const oneDayMs = 24 * 60 * 60 * 1000
          if (expiresAt - Date.now() < oneDayMs) {
            await refreshToken(token)
          }
        }
      } else if (res.status === 401) {
        // 토큰 만료 → 즉시 갱신 시도 (refresh 엔드포인트는 만료 토큰도 수락)
        await refreshToken(token)
      }
    } catch {
      // heartbeat 실패 무시
    }
  }

  send()
  heartbeatTimer = setInterval(send, 30_000)
}

async function refreshToken(currentToken: string): Promise<void> {
  try {
    const res = await fetch(getServerUrl() + '/api/device/token/refresh', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` },
    })
    if (res.ok) {
      const data = await res.json()
      // onlineSync 자체 토큰 갱신
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
      // Zustand store API로 토큰 갱신 (내부 구조 직접 조작 금지)
      const store = useSettingsStore.getState()
      if (store.deviceTerminalId) {
        store.setDeviceToken(data.accessToken, store.deviceTerminalId)
      }
    }
  } catch {
    // 갱신 실패 시 다음 heartbeat에서 재시도
  }
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

/**
 * 앱 종료 시 오프라인 상태 전송
 */
export function shutdownOnlineSync() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (!token) return

  stopConfigPolling()
  stopHeartbeat()

  // 비동기 종료 신호 (best-effort, keepalive로 Authorization 헤더 유지)
  fetch(getServerUrl() + '/api/device/heartbeat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'offline' }),
    keepalive: true,
  }).catch(() => {})
}
