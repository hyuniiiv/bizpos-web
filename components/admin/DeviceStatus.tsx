'use client'
import { useEffect, useState } from 'react'

type HealthStatus = 'ok' | 'error' | 'unknown'

interface DeviceHealth {
  label: string
  status: HealthStatus
}

async function fetchDeviceHealth(): Promise<DeviceHealth[]> {
  try {
    const res = await fetch(getServerUrl() + '/api/device/health', { cache: 'no-store' })
    if (!res.ok) throw new Error()
    return res.json()
  } catch {
    return [
      { label: '경광봉', status: 'unknown' },
      { label: '바코드리더', status: 'unknown' },
    ]
  }
}

const statusDot: Record<HealthStatus, string> = {
  ok: 'bg-green-500',
  error: 'bg-red-500',
  unknown: 'bg-white/30',
}

const statusLabel: Record<HealthStatus, string> = {
  ok: '정상',
  error: '오류',
  unknown: '확인불가',
}

export function DeviceStatus() {
  const [devices, setDevices] = useState<DeviceHealth[]>([])

  useEffect(() => {
    fetchDeviceHealth().then(setDevices)
    const timer = setInterval(() => fetchDeviceHealth().then(setDevices), 30_000)
    return () => clearInterval(timer)
  }, [])

  if (devices.length === 0) return null

  return (
    <div className="flex items-center gap-3">
      {devices.map(d => (
        <div key={d.label} className="flex items-center gap-1.5 text-sm text-white/60">
          <span className={`w-2 h-2 rounded-full ${statusDot[d.status]}`} />
          <span>{d.label}: {statusLabel[d.status]}</span>
        </div>
      ))}
    </div>
  )
}
