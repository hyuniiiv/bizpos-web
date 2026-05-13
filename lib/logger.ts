/**
 * 단말기 이벤트 로거
 *
 * 렌더러에서 console.* 호출 → Electron main의 'console-message' 핸들러가
 * 메인 프로세스 console로 포워딩 → initLogging()이 일별 파일 로그로 기록.
 *
 * 카테고리는 의도적으로 좁게 유지(payment/scan/config/device).
 * 새 카테고리는 추가하지 말고 기존 분류에 매핑.
 */
export type LogCategory = 'payment' | 'scan' | 'config' | 'device'

type LogData = Record<string, unknown> | undefined

function format(category: LogCategory, event: string, data?: LogData): string {
  const payload = data ? ' ' + safeStringify(data) : ''
  return `[${category}] ${event}${payload}`
}

function safeStringify(data: LogData): string {
  try {
    return JSON.stringify(data)
  } catch {
    return '[unserializable]'
  }
}

export const logger = {
  info(category: LogCategory, event: string, data?: LogData): void {
    console.log(format(category, event, data))
  },
  warn(category: LogCategory, event: string, data?: LogData): void {
    console.warn(format(category, event, data))
  },
  error(category: LogCategory, event: string, data?: LogData): void {
    console.error(format(category, event, data))
  },
}
