import { createCipheriv, createDecipheriv, createHmac } from 'crypto';

/**
 * 비플페이 API 암호화 규격
 * - AES256-CBC + PKCS5(PKCS7과 동일) 패딩 → HEXA 변환
 * - HmacSHA256 → HEXA 변환
 */

// IV = 16 zero bytes
const ZERO_IV = Buffer.alloc(16, 0);

export function encryptAES256(plaintext: string, key: string): string {
  // key를 UTF-8 문자열이 아닌 raw 바이트로 처리
  const keyBytes = Buffer.from(key, 'utf-8'); 
  const cipher = createCipheriv('aes-256-cbc', keyBytes, ZERO_IV);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  return encrypted.toString('hex').toUpperCase();
}

export function decryptAES256(cipherHex: string, key: string): string {
  const keyBytes = Buffer.from(key, 'utf-8');
  const decipher = createDecipheriv('aes-256-cbc', keyBytes, ZERO_IV);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf-8');
}

export function hmacSHA256(data: string, key: string): string {
  const keyBytes = Buffer.from(key, 'utf-8');
  return createHmac('sha256', keyBytes).update(data, 'utf-8').digest('hex').toUpperCase();
}

/**
 * API 요청 body 암호화
 */
export function buildEncryptedPayload(
  payload: object,
  encKey: string
): { EV: string; VV: string } {
  // null/undefined 제거
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
  // Python의 json.dumps와 정확히 일치하도록 공백 포함 직렬화
  // 파이썬: json.dumps(json_data) -> {"key": "value", "key2": "value2"} (콜론 뒤 공백 1개, 쉼표 뒤 공백 1개)
  const json = JSON.stringify(cleaned).replace(/":/g, '": ').replace(/,/g, ', ');

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
