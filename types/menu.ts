export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type DisplayMode = 'single' | 'multi'
export type InputAction = 'bizplay_payment' | 'meal_record' | 'disabled'
export type DupPolicy = 'block' | 'allow' | 'warn'

export interface InputPolicy {
  barcode: InputAction
  qr:      InputAction
  rfcard:  InputAction
}

export interface BadgeSettings {
  dup_policy: DupPolicy
  settle_day: number
}

export interface MenuConfig {
  id: string
  name: string
  displayAmount: number
  paymentAmount: number
  mealType: MealType
  startTime: string   // "HH:mm"
  endTime: string     // "HH:mm"
  soundFile: string
  isActive: boolean
  count: number
  imageUrl?: string
}

export interface PeriodConfig {
  mealType: MealType
  startTime: string
  endTime: string
  mode: DisplayMode
  label: string
}

export interface ServiceCodeConfig {
  id: string
  code: string       // 2자리 (예: "10", "20")
  menuName: string
  amount: number
}

export interface PosCategory {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface PosMenuItem {
  id: string
  categoryId: string
  name: string
  price: number
  description?: string
  isAvailable: boolean
  sortOrder: number
}

export interface DeviceConfig {
  termId: string
  termName?: string                            // 단말기 이름 (활성화 시 서버에서 수신)
  merchantId: string
  onlineAK: string
  bizNo: string
  corner: string
  adminPin: string
  serialPort: string
  offlineMode: boolean
  apiEnv: 'production' | 'development'
  autoResetTime: string  // "00:00"
  barcodeReaderType: 'keyboard' | 'serial' | 'camera'  // 바코드 리더 입력 방식
  barcodePort: string                         // 시리얼 바코드 리더 COM 포트
  externalDisplay: boolean                    // 외부 디스플레이 사용 여부
  mid: string                                 // 비플페이 가맹점코드 MID
  encKey: string                              // AES256-CBC 암복호화 키
  cafeteriaMode: boolean                      // 학생식당 모드 (판매현황 동시 표시)
  tableCount?: number                         // 테이블오더 테이블 수
  receiptPrint?: boolean                      // 영수증 출력 여부
  inputPolicy?: InputPolicy
}

export interface Employee {
  id: string
  merchant_id: string
  employee_no: string
  name: string
  department?: string
  card_number?: string
  barcode?: string
  is_active: boolean
  created_at: string
}

export interface MealUsage {
  id: string
  merchant_id: string
  terminal_id: string
  employee_id: string
  meal_type: MealType
  used_at: string
  amount: number
  menu_id?: string
  synced: boolean
}

export interface Settlement {
  id: string
  merchant_id: string
  period_start: string
  period_end: string
  total_count: number
  total_amount: number
  status: 'draft' | 'confirmed'
  created_at: string
  confirmed_at?: string
}

export interface SettlementItem {
  id: string
  settlement_id: string
  employee_id: string
  employee_no: string
  employee_name: string
  department?: string
  usage_count: number
  total_amount: number
  breakfast_count: number
  lunch_count: number
  dinner_count: number
}
