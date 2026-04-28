'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { startRemoteCommandListener } from '@/lib/remoteCommand'

export default function RemoteCommandListener() {
  const { deviceToken, deviceTerminalId } = useSettingsStore()

  useEffect(() => {
    if (!deviceToken || deviceToken === 'manual') return
    if (!deviceTerminalId) return
    let stop = () => {}
    try {
      stop = startRemoteCommandListener(deviceTerminalId)
    } catch (err) {
      console.warn('[RemoteCommandListener] failed to start:', err)
    }
    return () => { try { stop() } catch { /* ignore */ } }
  }, [deviceToken, deviceTerminalId])

  return null
}
