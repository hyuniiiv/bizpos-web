import CryptoJS from 'crypto-js'

/**
 * 비플페이 API 암호화 규격
 * - AES256-CBC + PKCS7 패딩 → HEXA 변환
 * - HmacSHA256 → HEXA 변환
 */

// IV = 16 zero bytes (0x00 × 16) — 비플페이 API 가이드 규격
const ZERO_IV = CryptoJS.enc.Hex.parse('00000000000000000000000000000000')

export function encryptAES256(plaintext: string, key: string): string {
  // Java .getBytes("UTF-8")과 일치하도록 Utf8.parse 사용 및 명시적 padding PKCS5 지정
  const keyBytes = CryptoJS.enc.Utf8.parse(key)
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plaintext), keyBytes, {
    iv: ZERO_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7, // CryptoJS는 PKCS7을 사용하지만, 블록암호화에선 PKCS5와 동일하게 동작
  })
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase()
}

export function decryptAES256(cipherHex: string, key: string): string {
  const keyBytes = CryptoJS.enc.Utf8.parse(key)
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(cipherHex),
  })
  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyBytes, {
    iv: ZERO_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

export function hmacSHA256(data: string, key: string): string {
  const hash = CryptoJS.HmacSHA256(data, key)
  return hash.toString(CryptoJS.enc.Hex).toUpperCase()
}

/**
 * API 요청 body 암호화
 * EV = AES256(JSON.stringify(payload))
 * VV = HmacSHA256(plaintext JSON, encKey)  — EV가 아닌 평문에 대해 HMAC
 */
export function buildEncryptedPayload(
  payload: object,
  encKey: string
): { EV: string; VV: string } {
  // null/undefined 제거 및 숫자형 보장
  const cleanPayload = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(cleanPayload)
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const val = obj[key]
        if (val !== undefined && val !== null) acc[key] = cleanPayload(val)
        return acc
      }, {} as any)
    }
    return obj
  }

  const cleaned = cleanPayload(payload)

  // Java JSONObject.toString() 방식과 최대한 유사하게 정렬 없이 직렬화
  const json = JSON.stringify(cleaned)
  
  console.log(`[bizplay] plain to encrypt: ${json}`)

  const EV = encryptAES256(json, encKey)
  const VV = hmacSHA256(json, encKey)
  return { EV, VV }
}

/**
 * API 응답 복호화
 */
export function decryptResponse<T>(EV: string, encKey: string): T {
  const json = decryptAES256(EV, encKey)
  return JSON.parse(json) as T
}
