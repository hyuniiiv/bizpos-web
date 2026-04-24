import { PaymentRepository } from '@/lib/repository/payment.repository'
import { getServerUrl } from '@/lib/serverUrl'
import { useSettingsStore } from '@/lib/store/settingsStore'

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

  if (!token || queue.length === 0) {
    useSettingsStore.getState().setPendingCount(0)
    return { synced: 0, failed: 0 }
  }

  let totalSynced = 0;
  let totalFailed = 0;
  
  // Batch processing (50 records per chunk)
  const BATCH_SIZE = 50;
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const chunk = queue.slice(i, i + BATCH_SIZE);
    
    try {
      const res = await fetch(getServerUrl() + '/api/payment/offline', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: chunk }),
      })

      if (res.ok) {
        const result = await res.json()
        const syncedIds: string[] = result.syncedIds ?? chunk.map(r => r.merchantOrderID)
        
        // Only mark records confirmed by the server as synced
        for (const id of syncedIds) {
          await PaymentRepository.markPaymentSynced(id)
        }
        
        totalSynced += syncedIds.length;
        totalFailed += (chunk.length - syncedIds.length);
      } else {
        totalFailed += chunk.length;
        console.error(`[txSync] Failed to sync chunk, status: ${res.status}`);
      }
    } catch (err) {
      totalFailed += chunk.length;
      console.error('[txSync] Network or sync error:', err);
    }
  }

  // 동기화 완료 후 남은 건수로 UI 스토어 갱신
  const remaining = await PaymentRepository.getPendingPayments()
  useSettingsStore.getState().setPendingCount(remaining.length)

  return { synced: totalSynced, failed: totalFailed }
}
