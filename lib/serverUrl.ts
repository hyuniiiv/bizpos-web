/**
 * 결제/디바이스 API 베이스 URL
 * - Electron 빌드: NEXT_PUBLIC_SERVER_URL = Vercel 서버 URL
 * - Vercel / 개발: 미설정 → 상대 URL (동일 서버)
 */
export function getServerUrl(): string {
  return (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')
}
