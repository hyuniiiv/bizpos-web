import type { BarcodeIdentity } from '@/types/payment'

/**
 * 비플식권 바코드/QR코드 식별
 *
 * 바코드: BIN(3)+기관구분(3)+결제시스템ID(4)+결제토큰(14)
 *   800088668039... → 비플식권1 간편결제
 *   800088668038... → 비플식권2 SaaS상품권
 *
 * QR코드: QR구분(1)-결제시스템ID(2)-결제토큰(14)-체크문자(4)
 *   3-BP-39... → 비플식권1 간편결제
 *   3-BP-38... → 비플식권2 SaaS상품권
 *
 * 유효시간: 170초
 */
export function identifyInput(raw: string): BarcodeIdentity {
  const s = raw.trim()

  // QR 코드 패턴
  if (s.startsWith('3-BP-39')) {
    return { type: 'qr', voucherType: 'voucher1', barcodeType: '2', raw: s }
  }
  if (s.startsWith('3-BP-38')) {
    return { type: 'qr', voucherType: 'voucher2', barcodeType: '2', raw: s }
  }
  if (s.startsWith('3-BP-30') || s.startsWith('3-ZP-')) {
    return { type: 'qr', voucherType: 'zeropay', barcodeType: '2', raw: s }
  }

  // 바코드 패턴 (24자리 이상)
  if (s.length >= 24) {
    if (s.startsWith('800088668039')) {
      // 결제토큰(14) 내 서비스구분코드: 바코드[22:24]
      const serviceCode = s.substring(22, 24)
      return { type: 'barcode', voucherType: 'voucher1', barcodeType: '1', serviceCode, raw: s }
    }
    if (s.startsWith('800088668038')) {
      const serviceCode = s.substring(22, 24)
      return { type: 'barcode', voucherType: 'voucher2', barcodeType: '1', serviceCode, raw: s }
    }
    if (s.startsWith('800088668030')) {
      return { type: 'barcode', voucherType: 'zeropay', barcodeType: '1', raw: s }
    }
  }

  // RF 카드 (사원증) - 숫자 또는 hex 10자리 이상
  if (/^[0-9A-Fa-f]{8,20}$/.test(s)) {
    return { type: 'rfcard', voucherType: 'rfcard', barcodeType: '3', raw: s }
  }

  return { type: 'barcode', voucherType: 'unknown', barcodeType: '1', raw: s }
}

export function maskBarcodeInfo(raw: string): string {
  if (raw.length <= 8) return raw
  return raw.substring(0, 6) + '****' + raw.substring(raw.length - 4)
}

/**
 * QR 유효시간 170초 체크
 */
export function isExpired(scannedAt: Date): boolean {
  return Date.now() - scannedAt.getTime() > 170 * 1000
}
