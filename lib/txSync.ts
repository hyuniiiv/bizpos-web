/**
 * 오프라인 모드 단말기 전용 결제 큐 관리
 * - input_policy.mode = 'offline' 인 단말기만 사용
 * - 네트워크 실패 시 자동 전환 없음 (명시적 오프라인 모드만 해당)
 */

import { markPaymentSynced } from '@/lib/db/indexeddb'

const ACCESS_TOKEN_KEY = 'terminal_access_token'
const OFFLINE_QUEUE_KEY = 'tx_offline_queue'

export interface OfflinePaymentRecord {
  merchantOrderID: string
  merchantOrderDt: string
  termId: string
  barcodeInfo: string
  barcodeType: string
  productName: string
  totalAmount: number
  savedAt: string
}

function getAccessToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function getOfflineQueue(): OfflinePaymentRecord[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addToOfflineQueue(record: OfflinePaymentRecord): void {
  const queue = getOfflineQueue()
  queue.push(record)
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY)
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length
}

/**
 * 오프라인 큐를 /api/payment/offline으로 전송해 실제 결제 처리
 * 온라인 복귀 또는 관리자 수동 동기화 시 호출
 */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const token = getAccessToken()
  const queue = getOfflineQueue()

  if (!token || queue.length === 0) return { synced: 0, failed: 0 }

  try {
    const res = await fetch('/api/payment/offline', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: queue }),
    })

    if (res.ok) {
      const result = await res.json()
      clearOfflineQueue()
      await Promise.all(queue.map(r => markPaymentSynced(r.merchantOrderID)))
      return { synced: result.synced ?? queue.length, failed: 0 }
    }
  } catch {
    // 실패 시 큐 유지, 다음 시도에서 재전송
  }

  return { synced: 0, failed: queue.length }
}
