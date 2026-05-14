/**
 * BizPlay PG 시각 포맷을 PostgreSQL/JS Date가 인식 가능한 ISO 8601로 변환.
 *
 * BizPlay 응답의 시각 필드(approvedAt, cancelledAt 등)는:
 * - 14자리 YYYYMMDDHHMMSS (KST 가정)
 * - 17자리 YYYYMMDDHHMMSSmmm (KST, millisecond 포함)
 *
 * PostgreSQL timestamptz는 ISO 8601만 인식하므로 그대로 INSERT하면
 * '22008: date/time field value out of range' 오류 발생.
 */
export function bizplayDateToIso(value: string | null | undefined): string {
  if (!value) return new Date().toISOString()
  if (/^\d{14}$/.test(value)) {
    const s = value
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}+09:00`
  }
  if (/^\d{17}$/.test(value)) {
    const s = value
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}.${s.slice(14, 17)}+09:00`
  }
  // 이미 ISO 8601 또는 알 수 없는 형식 — 그대로 반환 (PostgreSQL이 파싱 시도)
  return value
}
