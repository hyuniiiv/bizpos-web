/**
 * 비플페이 PG API 클라이언트
 * 서버사이드(Next.js API Route)에서만 사용
 */
import type {
  ReserveRequest, ReserveResponse,
  ApprovalRequest, ApprovalResponse,
  CancelRequest, CancelResponse,
} from '@/types/payment'
import { buildEncryptedPayload, decryptResponse } from './crypto'

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
    const requestBody = {
      MID: this.mid,
      RQ_DTIME: getRqDtime(),
      TNO: generateTNO(this.mid),
      EV,
      VV,
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
          'Authorization': `OnlineAK ${this.onlineAK}`,
          'Connection': 'keep-alive',
        },
        body: JSON.stringify(requestBody),
        keepalive: true,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    }
    const json = await res.json()
    if (json.EV) {
      return decryptResponse<T>(json.EV, this.encKey)
    }
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
