import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTerminalAuth } from '@/lib/terminal/auth'

export async function POST(request: NextRequest) {
  const auth = await requireTerminalAuth(request)
  if ('error' in auth) return auth.error

  const { terminalId, merchantId } = auth.payload
  const { transactions } = await request.json()

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0 })
  }

  const supabase = createAdminClient()

  const rows = transactions.map((tx: {
    merchantOrderId: string
    menuName?: string
    amount: number
    barcodeInfo?: string
    paymentType: string
    status: string
    approvedAt: string
    userName?: string
    user_name?: string
    tid?: string
  }) => ({
    terminal_id: terminalId,
    merchant_id: merchantId,
    merchant_order_id: tx.merchantOrderId,
    menu_name: tx.menuName ?? '',
    amount: tx.amount,
    barcode_info: tx.barcodeInfo ?? '',
    payment_type: tx.paymentType,
    status: tx.status,
    approved_at: tx.approvedAt,
    user_name: tx.userName ?? tx.user_name ?? '',
    tid: tx.tid ?? '',
    synced: true,
  }))

  const { data, error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'merchant_order_id' })
    .select('id')

  if (error) {
    console.error('[transactions/batch] error:', error)
    return NextResponse.json({ synced: 0, failed: transactions.length }, { status: 500 })
  }

  return NextResponse.json({ synced: data?.length ?? 0, failed: 0 })
}
