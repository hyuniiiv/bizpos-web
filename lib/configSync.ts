import { getServerUrl } from '@/lib/serverUrl'

const CONFIG_VERSION_KEY = 'terminal_config_version'

let pollInterval: ReturnType<typeof setInterval> | null = null

export interface ConfigSyncResult {
  version: number
  config: Record<string, unknown>
  changed: boolean
  termName?: string | null
}

export function getConfigVersion(): number {
  if (typeof localStorage === 'undefined') return 0
  return parseInt(localStorage.getItem(CONFIG_VERSION_KEY) ?? '0')
}

export function setConfigVersion(version: number) {
  localStorage.setItem(CONFIG_VERSION_KEY, String(version))
}

export async function fetchLatestConfig(token: string): Promise<ConfigSyncResult | null> {
  if (!token || !navigator.onLine) return null

  try {
    const res = await fetch(getServerUrl() + '/api/device/config', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Config-Version': String(getConfigVersion()),
      },
    })

    if (!res.ok) return null

    const data = await res.json()

    if (data.changed && data.config) {
      setConfigVersion(data.version)
      return { version: data.version, config: data.config, changed: true, termName: data.termName ?? null }
    }

    return { version: data.version, config: {}, changed: false, termName: data.termName ?? null }
  } catch {
    return null
  }
}

export function startConfigPolling(
  onConfigChanged: (config: Record<string, unknown>, termName?: string | null) => void,
  token: string,
  intervalMs = 30_000
) {
  if (pollInterval) return

  const poll = async () => {
    const result = await fetchLatestConfig(token)
    if (result) {
      if (result.changed && result.config) {
        onConfigChanged(result.config, result.termName)
      } else if (result.termName !== undefined) {
        onConfigChanged({}, result.termName)
      }
    }
  }

  poll()
  pollInterval = setInterval(poll, intervalMs)
}

export function stopConfigPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}
