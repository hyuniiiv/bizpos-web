/**
 * Supabase DB 타입 정의
 * - merchants, terminals, terminal_configs, transactions 테이블
 */

export interface Merchant {
  id: string
  name: string
  biz_no: string | null
  merchant_id: string | null
  contact_email: string | null
  created_at: string
}

export interface Terminal {
  id: string
  merchant_id: string
  term_id: string
  name: string
  corner: string
  activation_code: string | null
  access_token: string | null
  status: 'online' | 'offline' | 'inactive'
  last_seen_at: string | null
  created_at: string
  merchant_key_id: string | null
  terminal_account_id: string | null
  terminal_account_hash: string | null
}

export interface TerminalConfig {
  id: string
  terminal_id: string
  config: Record<string, unknown>
  version: number
  created_by: string | null
  created_at: string
}

export interface Transaction {
  id: string
  terminal_id: string
  merchant_id: string
  merchant_order_id: string
  menu_name: string
  amount: number
  barcode_info: string | null
  payment_type: 'qr' | 'barcode' | 'rfcard'
  status: 'success' | 'cancelled'
  approved_at: string
  synced: boolean
  user_name: string | null
  tid: string | null
  cancelled_at: string | null
  created_at: string
}

export interface AnomalyAlert {
  id: string
  merchant_id: string
  terminal_id: string | null
  transaction_id: string | null
  rule: 'duplicate_barcode' | 'high_frequency' | 'high_amount'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  detail: Record<string, unknown> | null
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

export interface MerchantKey {
  id: string
  merchant_id: string
  name: string
  mid: string
  enc_key: string
  online_ak: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
