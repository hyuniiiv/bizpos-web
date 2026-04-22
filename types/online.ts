/**
 * 온라인 관리 도메인 타입
 * - 단말기 활성화, 설정 동기화, 거래내역 관련 타입
 */

export type OnlineSyncStatus = 'need_activation' | 'online' | 'offline'

export interface TerminalActivateRequest {
  activationCode: string
  terminalName?: string
}

export interface TerminalActivateResponse {
  terminalId: string
  termId: string
  accessToken: string
  merchantId: string
  config: Record<string, unknown> | null
  configVersion: number
}

export interface ConfigPollResponse {
  version: number
  config?: Record<string, unknown>
  changed: boolean
}

export interface TransactionSyncPayload {
  merchantOrderId: string
  menuName: string
  amount: number
  barcodeInfo?: string
  paymentType: 'qr' | 'barcode' | 'rfcard'
  status: 'success' | 'cancelled'
  approvedAt: string
  userName?: string
  tid?: string
}

export interface BatchSyncResult {
  synced: number
  failed: number
}

export interface ApiErrorResponse {
  error: string       // 에러 코드 (예: 'UNAUTHORIZED')
  message?: string    // 선택적 설명
}
