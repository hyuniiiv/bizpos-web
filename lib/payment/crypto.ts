import CryptoJS from 'crypto-js'

/**
 * 비플페이 API 암호화 규격
 * - AES256-CBC + PKCS7 패딩 → HEXA 변환
 * - HmacSHA256 → HEXA 변환
 */

// IV = 16 zero bytes (0x00 × 16) — 비플페이 API 가이드 규격
const ZERO_IV = CryptoJS.enc.Hex.parse('00000000000000000000000000000000')

export function encryptAES256(plaintext: string, key: string): string {
  const keyBytes = CryptoJS.enc.Utf8.parse(key.substring(0, 32).padEnd(32, '0'))
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyBytes, {
    iv: ZERO_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase()
}

export function decryptAES256(cipherHex: string, key: string): string {
  const keyBytes = CryptoJS.enc.Utf8.parse(key.substring(0, 32).padEnd(32, '0'))
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
  const json = JSON.stringify(payload)
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
