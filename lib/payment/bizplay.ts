/**
 * 비플페이 PG API 클라이언트
 * 서버사이드(Next.js API Route)에서만 사용
 */
import type {
  ReserveRequest, ReserveResponse,
  ApprovalRequest, ApprovalResponse,
  CancelRequest, CancelResponse,
} from '@/types/payment'
import { buildEncryptedPayload, decryptResponse, decryptAES256 } from './crypto'

const BASE_URL = {
  production: 'https://pgapi.bizplaypay.co.kr',
  development: 'https://pgapi-dev.bizplaypay.co.kr',
}

function getRqDtime(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function generateTNO(mid: string): string {
  // TNO: MID + YYYYMMDDHHMMSS + 3자리 시퀀스
  return `${mid}${getRqDtime()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
}

export class BizplayClient {
  private baseUrl: string
  private mid: string
  private encKey: string   // AES256 암복호화 키
  private onlineAK: string // HEADER 인증키

  constructor(opts: {
    mid: string
    encKey: string
    onlineAK: string
    env?: 'production' | 'development'
  }) {
    this.mid = opts.mid
    this.encKey = opts.encKey
    this.onlineAK = opts.onlineAK
    this.baseUrl = BASE_URL[opts.env ?? 'production']
  }

  /**
   * 공통 Body Wrapper: { MID, RQ_DTIME, TNO, EV, VV }
   * EV = AES256(JSON.stringify(payload), encKey)
   * VV = HmacSHA256(plaintext JSON, encKey)
   */
  private async post<T>(path: string, body: object): Promise<T> {
    const { EV, VV } = buildEncryptedPayload(body, this.encKey)
    console.log(`[bizplay] sending EV=${EV} VV=${VV}`)
    // 헤더 값 검증을 위해 전체를 로깅
    console.log(`[bizplay] Authorization header used: ${this.onlineAK}`)
    // 공식 명세(20자)를 준수하되, 샘플 로직을 참고하여 유니크하게 생성
    // 샘플 코드와 완벽히 일치하도록, RC, RM 필드 추가
    const rqDtime = getRqDtime()
    // 샘플 코드에서는 TNO가 RQ_DTIME과 동일함
    // 샘플 명세에 맞게 RC, RM 필드를 JSON 구조의 최상단에 배치하고 명세 순서 준수
    const rqDtime = getRqDtime()
    const requestBody = {
      MID: this.mid,
      RQ_DTIME: rqDtime,
      TNO: rqDtime,
      EV,
      VV,
      RC: '',
      RM: ''
    }
    // Keep-alive + connection 재사용 (Vercel ↔ Bizplay).
    // Node 18+ undici 는 기본 pooling 하지만 명시적으로 유지 신호 전달.
    // AbortController 15초 timeout — Bizplay hang 시 빠른 실패로 단말기 lock 방지.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': `${this.onlineAK}`,
          'Connection': 'keep-alive',
        },
        body: JSON.stringify(requestBody),
        keepalive: true,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
    const rawText = await res.text()
    let parsedRaw: any = {}
    try {
        parsedRaw = JSON.parse(rawText)
        console.log(`[bizplay] received raw: RC=${parsedRaw.RC}, RM=${parsedRaw.RM}, content=${rawText.slice(0, 400)}`)
    } catch {
        console.log(`[bizplay] received raw (non-json): ${rawText.slice(0, 400)}`)
    }
    
    if (!res.ok) {
      console.error(`[bizplay] http_error path=${path} mid=${this.mid} status=${res.status} body=${rawText.slice(0, 400)}`)
      throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 400)}`)
    }
    let json: { EV?: string, VV?: string } & Record<string, unknown> = parsedRaw
    try {
      // json is already parsed above
    } catch {
      console.error(`[bizplay] parse_failed path=${path} mid=${this.mid} rawSnippet=${rawText.slice(0, 400)}`)
      throw new Error(`Invalid JSON from BizPlay: ${rawText.slice(0, 200)}`)
    }
    if (json.EV) {
      let plaintext: string
      try {
        plaintext = decryptAES256(json.EV, this.encKey)
      } catch (err) {
        console.error(`[bizplay] decrypt_failed path=${path} mid=${this.mid} encKeyLen=${this.encKey.length} evLen=${json.EV.length} error=${err instanceof Error ? err.message : String(err)}`)
        throw err
      }
      // 복호화된 평문 진단 (echo 응답 여부 확인용 — 진단 중 전체 출력)
      console.log(`[bizplay] decrypted path=${path} mid=${this.mid} plain=${plaintext}`)
      try {
        const parsed = JSON.parse(plaintext)
        console.log(`[bizplay] response data:`, JSON.stringify(parsed))
        return parsed as T
      } catch (err) {
        console.error(`[bizplay] decrypted_parse_failed path=${path} mid=${this.mid} plain=${plaintext}`)
        throw err
      }
    }
    // EV 없는 평문 응답 — 인증 실패 또는 잘못된 키 헤더로 BizPlay가 평문 에러를 돌려줬을 가능성
    console.warn(`[bizplay] plaintext_response path=${path} mid=${this.mid} keys=${Object.keys(json).join(',')} snippet=${rawText.slice(0, 400)}`)
    return json as T
  }

  /** 결제준비 (POS) */
  async reserve(payload: ReserveRequest): Promise<ReserveResponse> {
    return this.post<ReserveResponse>('/api_v1_pos_payment_reserve.jct', payload)
  }

  /** 결제승인 */
  async approve(payload: ApprovalRequest): Promise<ApprovalResponse> {
    return this.post<ApprovalResponse>('/api_v1_payment_approval.jct', payload)
  }

  /** 결제취소 */
  async cancel(payload: CancelRequest): Promise<CancelResponse> {
    return this.post<CancelResponse>('/api_v1_payment_cancel.jct', payload)
  }

  /** 거래결과조회 */
  async getTransactionResult(payload: { merchantOrderID: string; tid: string }): Promise<Record<string, unknown>> {
    return this.post('/api_v1_payment_result.jct', payload)
  }

  /** 결제취소요청 (비동기 취소) */
  async cancelRequest(payload: CancelRequest): Promise<CancelResponse> {
    return this.post<CancelResponse>('/api_v1_payment_cancel_req.jct', payload)
  }

  /** 헬스체크 */
  async healthCheck(): Promise<{ code: string; msg: string }> {
    return this.post('/api_v1_payment_healthcheck.jct', { MID: this.mid })
  }

  /** 오프라인 결제 일괄 전송 */
  async syncOffline(records: object[]): Promise<{ code: string; msg: string }> {
    return this.post('/api_v1_pos_payment_offline.jct', { records })
  }
}

/** Mock 클라이언트 (개발/테스트용) */
export class MockBizplayClient {
  async reserve(payload: ReserveRequest): Promise<ReserveResponse> {
    await new Promise(r => setTimeout(r, 300))
    return {
      code: '0000',
      msg: '성공',
      data: {
        tid: `MOCK${Date.now()}000000`,
        token: 'MOCK_TOKEN_' + Math.random().toString(36).substring(2),
      },
    }
  }

  async approve(payload: ApprovalRequest): Promise<ApprovalResponse> {
    await new Promise(r => setTimeout(r, 500))
    if (payload.merchantOrderID.includes('FAIL')) {
      return { code: 'A002', msg: '잔액 부족' }
    }
    return {
      code: '0000',
      msg: '성공',
      data: {
        merchantOrderID: payload.merchantOrderID,
        tid: payload.tid,
        approvedAt: new Date().toISOString(),
        userName: '테스트 사용자',
        usedAmount: payload.totalAmount,
      },
    }
  }

  async cancel(payload: CancelRequest): Promise<CancelResponse> {
    await new Promise(r => setTimeout(r, 300))
    return {
      code: '0000',
      msg: '성공',
      data: { tid: payload.tid, cancelledAt: new Date().toISOString() },
    }
  }

  async getTransactionResult() { return { code: '0000', msg: 'OK' } }
  async cancelRequest(payload: CancelRequest): Promise<CancelResponse> {
    return this.cancel(payload)
  }
  async healthCheck() { return { code: '0000', msg: 'OK' } }
  async syncOffline() { return { code: '0000', msg: 'OK' } }
}
