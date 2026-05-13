import { PaymentRepository } from '@/lib/repository/payment.repository'
import { getServerUrl } from '@/lib/serverUrl'
import { useSettingsStore } from '@/lib/store/settingsStore'
import { logger } from '@/lib/logger'

// 동시 flush 방지 — online 이벤트와 mount effect가 동시에 트리거될 수 있음
let isFlushing = false

/**
 * 오프라인 큐를 /api/payment/offline으로 전송해 실제 결제 처리
 * 온라인 복귀 또는 관리자 수동 동기화 시 호출
 */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (isFlushing) return { synced: 0, failed: 0 }
  isFlushing = true

  // localStorage가 아닌 IndexedDB 기반 Zustand store에서 토큰 읽기
  // (활성화 흐름이 setDeviceToken → IndexedDB만 저장하므로 localStorage는 항상 null)
  const token = useSettingsStore.getState().deviceToken
  const queue = await PaymentRepository.getPendingPayments()

  if (!token || queue.length === 0) {
    useSettingsStore.getState().setPendingCount(queue.length)
    isFlushing = false
    return { synced: 0, failed: 0 }
  }

  logger.info('payment', 'offline_flush_start', { queued: queue.length })
  let synced = 0
  let failed = 0

  try {
    const res = await fetch(getServerUrl() + '/api/payment/offline', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: queue }),
    })

    if (res.ok) {
      const result = await res.json()
      // 서버가 명시적으로 확인한 ID만 처리 (폴백 시 빈 배열 → 재시도 보장)
      const syncedIds: string[] = result.syncedIds ?? []
      for (const id of syncedIds) {
        await PaymentRepository.markPaymentSynced(id)
      }
      synced = syncedIds.length
      failed = queue.length - syncedIds.length
    } else {
      failed = queue.length
      logger.error('payment', 'offline_flush_http_error', { status: res.status })
    }
  } catch (err) {
    failed = queue.length
    logger.error('payment', 'offline_flush_exception', { error: String(err) })
  }

  const remaining = await PaymentRepository.getPendingPayments()
  useSettingsStore.getState().setPendingCount(remaining.length)
  logger.info('payment', 'offline_flush_done', { synced, failed, remaining: remaining.length })

  isFlushing = false
  return { synced, failed }
}
