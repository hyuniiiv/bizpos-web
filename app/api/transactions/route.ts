import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 거래내역 파일 경로 (서버 데이터 디렉토리)
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const TX_FILE = path.join(DATA_DIR, 'transactions.json')

interface StoredTransaction {
  approvedAt?: string
  createdAt?: string
  status: string
  amount?: number
  [key: string]: unknown
}

// 인메모리 캐시 (성능 최적화)
let cache: StoredTransaction[] | null = null

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadFromFile(): StoredTransaction[] {
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

function saveToFile(txs: StoredTransaction[]) {
  ensureDir()
  // 최대 5000건 유지
  const trimmed = txs.slice(0, 5000)
  fs.writeFileSync(TX_FILE, JSON.stringify(trimmed, null, 2), 'utf-8')
  cache = trimmed
}

export function addTransaction(tx: StoredTransaction) {
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
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { requireTerminalAuth } = await import('@/lib/terminal/auth')
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error

  const { terminalId } = auth.payload
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 1000)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const date = searchParams.get('date')
  const dateStart = searchParams.get('dateStart')
  const dateEnd = searchParams.get('dateEnd')

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('terminal_id', terminalId)
      .order('approved_at', { ascending: false })

    if (dateStart && dateEnd) {
      query = query
        .gte('approved_at', `${dateStart}T00:00:00.000Z`)
        .lte('approved_at', `${dateEnd}T23:59:59.999Z`)
    } else if (date) {
      query = query
        .gte('approved_at', `${date}T00:00:00.000Z`)
        .lte('approved_at', `${date}T23:59:59.999Z`)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('[transactions GET] supabase error:', error)
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
    }

    const items = (data ?? []).map(tx => ({
      id: tx.id,
      merchantOrderID: tx.merchant_order_id,
      tid: tx.tid ?? '',
      menuId: '',
      menuName: tx.menu_name ?? '',
      userName: tx.user_name ?? '',
      amount: tx.amount,
      paymentType: tx.payment_type,
      status: tx.status,
      approvedAt: tx.approved_at,
      cancelledAt: tx.cancelled_at ?? undefined,
      barcodeInfo: tx.barcode_info ?? '',
      synced: tx.synced,
      createdAt: tx.created_at,
      termId: terminalId,
    }))

    const totalAmount = items
      .filter(tx => tx.status === 'success')
      .reduce((sum, tx) => sum + (tx.amount ?? 0), 0)

    return NextResponse.json({ total: count ?? 0, totalAmount, items })
  } catch (e) {
    console.error('[transactions GET] error:', e)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
