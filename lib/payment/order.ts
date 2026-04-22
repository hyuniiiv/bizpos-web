/**
 * 주문번호 생성
 * 형식: YYYYMMDDHHmmss + termId(2자리) = 16자리 UNIQUE
 * 중복거래 방지: 동일 termId + 동일 초에 중복 요청 불가
 */
export function generateOrderId(termId: string): {
  merchantOrderDt: string
  merchantOrderID: string
} {
  const now = new Date()
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')

  const dt =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())  // 14자리: YYYYMMDDHHmmss

  const tid2 = termId.padStart(2, '0').substring(0, 2)

  return {
    merchantOrderDt: dt.substring(0, 8),   // YYYYMMDD
    merchantOrderID: `${dt}${tid2}`,        // 16자리
  }
}

/**
 * 현재 시각 → RQ_DTIME 형식
 */
export function getRqDtime(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  )
}
