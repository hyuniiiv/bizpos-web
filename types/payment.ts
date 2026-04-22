export type VoucherType = 'voucher1' | 'voucher2' | 'zeropay' | 'rfcard' | 'unknown'
export type InputType = 'barcode' | 'qr' | 'rfcard'
export type PaymentStatus = 'success' | 'failed' | 'cancelled' | 'pending_offline'

export interface BarcodeIdentity {
  type: InputType
  voucherType: VoucherType
  barcodeType: '1' | '2' | '3'
  serviceCode?: string
  raw: string
}

export interface ReserveRequest {
  merchantOrderDt: string
  merchantOrderID: string
  merchantUserKey?: string
  productName: string
  quantity: number
  totalAmount: number
  taxFreeAmount: number
  vatAmount?: number
  productItems: ProductItem[]
  complexYn: 'Y' | 'N'
  barcodeType: '1' | '2' | '3'
  barcodeInfo: string
  termId?: string
}

export interface ProductItem {
  seq: string
  category: string
  biz_no: string
  name: string
  count: number
  amount: number
}

export interface ReserveResponse {
  code: string
  msg: string
  data?: {
    tid: string
    token: string
  }
}

export interface ApprovalRequest {
  merchantOrderDt: string
  merchantOrderID: string
  tid: string
  totalAmount: number
  token: string
}

export interface ApprovalResponse {
  code: string
  msg: string
  data?: {
    merchantOrderID: string
    tid: string
    approvedAt: string
    userName?: string
    usedAmount?: number
    cancelledAmount?: number
  }
}

export interface CancelRequest {
  merchantOrderDt: string
  merchantOrderID: string
  merchantCancelDt: string      // 취소 요청일시 YYYYMMDDHHMMSS
  merchantCancelID: string      // 취소 주문번호 (가맹점 고유)
  tid: string
  totalAmount: number
  totalCancelAmount: number     // 총 취소 금액
  cancelTaxFreeAmount: number   // 취소 비과세 금액
  partYn: 'Y' | 'N'             // 부분취소 여부
  cancelReason?: string
}

export interface CancelResponse {
  code: string
  msg: string
  data?: {
    tid: string
    cancelledAt: string
  }
}

export interface Transaction {
  id: string
  merchantOrderID: string
  tid: string
  menuId: string
  menuName: string
  userName: string
  amount: number
  paymentType: InputType
  voucherType: VoucherType
  status: PaymentStatus
  approvedAt: string
  cancelledAt?: string
  barcodeInfo: string
  synced: boolean
  createdAt: string
}

export interface OfflineRecord {
  merchantOrderDt: string
  merchantOrderID: string
  barcodeType: '1' | '2' | '3'
  barcodeInfo: string
  totalAmount: number
  productName: string
  termId: string
  savedAt: string
  synced: boolean
}
