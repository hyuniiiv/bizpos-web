import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 거래내역 파일 경로 (서버 데이터 디렉토리)
const DATA_DIR = path.join(process.cwd(), 'data')
const TX_FILE = path.join(DATA_DIR, 'transactions.json')

// 인메모리 캐시 (성능 최적화)
let cache: object[] | null = null

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadFromFile(): object[] {
  if (cache !== null) return cache
  ensureDir()
  try {
    if (fs.existsSync(TX_FILE)) {
      cache = JSON.parse(fs.readFileSync(TX_FILE, 'utf-8'))
    } else {
      cache = []
    }
  } catch {
    cache = []
  }
  return cache!
}

function saveToFile(txs: object[]) {
  ensureDir()
  // 최대 5000건 유지
  const trimmed = txs.slice(0, 5000)
  fs.writeFileSync(TX_FILE, JSON.stringify(trimmed, null, 2), 'utf-8')
  cache = trimmed
}

export function addTransaction(tx: object) {
  const txs = loadFromFile()
  txs.unshift(tx)
  saveToFile(txs)
}

export async function POST(request: NextRequest) {
  // 단말기 JWT 인증 후 Supabase에 거래내역 저장
  const { requireTerminalAuth } = await import('@/lib/terminal/auth')
  const authResult = await requireTerminalAuth(request)
  if ('error' in authResult) return authResult.error
  const { terminalId, merchantId } = authResult.payload

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const body = await request.json()
    const { merchantOrderId, menuName, amount, barcodeInfo, paymentType, status, approvedAt, userName, tid } = body

    if (!merchantOrderId || !amount || !paymentType || !status) {
      return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        terminal_id: terminalId,
        merchant_id: merchantId,
        merchant_order_id: merchantOrderId,
        menu_name: menuName ?? '',
        amount,
        barcode_info: barcodeInfo ?? '',
        payment_type: paymentType,
        status,
        approved_at: approvedAt ?? new Date().toISOString(),
        synced: true,
        user_name: userName ?? '',
        tid: tid ?? '',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[transactions] supabase error:', error)
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
    }

    // 이상 감지 (비동기, 거래 응답 블로킹 안 함)
    const { detectAnomalies } = await import('@/lib/anomaly/detector')
    detectAnomalies({
      id: data.id,
      merchant_id: merchantId,
      terminal_id: terminalId,
      barcode_info: barcodeInfo ?? null,
      amount,
      approved_at: approvedAt ?? new Date().toISOString(),
    }).catch(console.error)

    return NextResponse.json({ id: data.id })
  } catch {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  // 단말기 JWT 인증
  const { requireTerminalAuth } = await import('@/lib/terminal/auth')
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '200')
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const date = searchParams.get('date')  // YYYY-MM-DD

  const transactions = loadFromFile()
  let filtered = [...transactions]
  if (date) {
    filtered = filtered.filter((tx: any) => {
      const at: string = tx.approvedAt ?? tx.createdAt ?? ''
      return at.startsWith(date)
    })
  }

  const validFiltered = filtered.filter((tx: any) => (tx.status === 'success' || tx.status === 'offline'))
  const total = validFiltered.length
  const totalAmount = validFiltered.reduce((sum: number, tx: any) => sum + (tx.amount ?? 0), 0)

  return NextResponse.json({
    total,
    totalAmount,
    items: validFiltered.slice(offset, offset + limit),
  })
}
