/**
 * approve 실패 후 이중 결제 방지 처리
 * 1. /api/payment/result로 PG에 실제 승인 상태 조회
 * 2. PG가 성공이면 isActuallySucceeded=true 반환
 * 3. 성공/실패/오류 모두 pending 큐에서 제거 (온라인 실패 건 재시도 방지)
 */
interface ResolveOptions {
  serverUrl: string
  deviceToken: string
  merchantOrderID: string
  tid: string
  markPaymentSynced: (id: string) => Promise<unknown>
}

export async function resolveApproveFailure(opts: ResolveOptions): Promise<{ isActuallySucceeded: boolean }> {
  const { serverUrl, deviceToken, merchantOrderID, tid, markPaymentSynced } = opts

  let isActuallySucceeded = false

  try {
    const res = await fetch(`${serverUrl}/api/payment/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deviceToken}` },
      body: JSON.stringify({ merchantOrderID, tid }),
    })
    const data = await res.json()
    if (data.code === '0000') {
      isActuallySucceeded = true
    }
  } catch {
    // 네트워크 오류 — 안전하게 실패 처리
  }

  // 온라인 상태에서 처리 시도한 건 → pending 큐 제거 (재시도 방지)
  await markPaymentSynced(merchantOrderID).catch(() => {})

  return { isActuallySucceeded }
}
