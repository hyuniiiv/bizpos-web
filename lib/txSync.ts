import { PaymentRepository } from '@/lib/repository/payment.repository'
import { getServerUrl } from '@/lib/serverUrl'

const ACCESS_TOKEN_KEY = 'terminal_access_token'

function getAccessToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * 오프라인 큐를 /api/payment/offline으로 전송해 실제 결제 처리
 * 온라인 복귀 또는 관리자 수동 동기화 시 호출
 */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const token = getAccessToken()
  const queue = await PaymentRepository.getPendingPayments()

  if (!token || queue.length === 0) return { synced: 0, failed: 0 }

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
      await Promise.all(queue.map(r => PaymentRepository.markPaymentSynced(r.merchantOrderID)))
      return { synced: result.synced ?? queue.length, failed: 0 }
    }
  } catch {
    // 실패 시 큐 유지, 다음 시도에서 재전송
  }

  return { synced: 0, failed: queue.length }
}
