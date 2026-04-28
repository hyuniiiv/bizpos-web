/**
 * 주문번호 생성
 * 형식: YYYYMMDDHHmmss + ms(3자리) + seq(2자리) + termId(2자리) = 21자리
 * 밀리초 + 시퀀스 카운터로 동일 ms 내 중복 완전 방지
 */

let _seq = 0

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
    pad(now.getSeconds())   // 14자리: YYYYMMDDHHmmss

  const ms = pad(now.getMilliseconds(), 3)  // 밀리초 3자리
  const seq = pad(_seq++ % 100, 2)           // 시퀀스 2자리 (00-99)
  const tid2 = termId.padStart(2, '0').substring(0, 2)

  return {
    merchantOrderDt: dt.substring(0, 8),             // YYYYMMDD
    merchantOrderID: `${dt}${ms}${seq}${tid2}`,       // 21자리
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
