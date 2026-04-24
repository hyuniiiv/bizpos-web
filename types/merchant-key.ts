export type KeyEnv = 'production' | 'development'

export interface MerchantKey {
  id: string
  name: string
  mid: string        // 마스킹됨: ****XXXX
  enc_key: string    // 마스킹됨: ****XXXX
  online_ak: string  // 마스킹됨: ****XXXX
  description: string | null
  is_active: boolean
  env: KeyEnv
  store_id: string | null
  created_at: string
}

export interface MerchantKeyCreateInput {
  name: string
  mid: string
  enc_key: string
  online_ak: string
  description?: string
  env: KeyEnv
  store_id?: string | null
}

export interface MerchantKeyUpdateInput {
  name?: string
  mid?: string
  enc_key?: string
  online_ak?: string
  description?: string
  is_active?: boolean
  env?: KeyEnv
}
