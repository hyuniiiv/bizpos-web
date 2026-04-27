/**
 * 매출 분석 집계 쿼리
 * - Supabase JS SDK로 transactions 조회 후 JS에서 집계 (GROUP BY 미지원)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface MenuSummary {
  menu_name: string
  total_amount: number
  count: number
  ratio: number
}

export interface DailySummary {
  date: string
  total_amount: number
  count: number
}

export interface TerminalSummary {
  terminal_id: string
  terminal_name: string
  term_id: string
  total_amount: number
  count: number
}

export interface TerminalTypeSummary {
  terminal_type: string
  label: string
  total_amount: number
  count: number
}

export interface StoreSummary {
  store_id: string
  store_name: string
  total_amount: number
  count: number
}

export interface AnalyticsSummary {
  totalAmount: number
  totalCount: number
  avgAmount: number
}

const TERMINAL_TYPE_LABELS: Record<string, string> = {
  ticket_checker: '식권체크기',
  pos: 'POS',
  kiosk: '키오스크',
  table_order: '테이블오더',
}

type TxRow = {
  amount: number
  menu_name: string
  approved_at: string
  terminal_id: string
  terminals: { name: string; term_id: string; terminal_type: string | null; store_id: string | null } | null
}

async function fetchSuccessTxs(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string,
  storeId?: string
): Promise<TxRow[]> {
  let query = supabase
    .from('transactions')
    .select('amount, menu_name, approved_at, terminal_id, terminals(name, term_id, terminal_type, store_id)')
    .eq('merchant_id', merchantId)
    .eq('status', 'success')
    .gte('approved_at', from)
    .lte('approved_at', to)

  if (storeId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('terminals.store_id', storeId)
  }

  const { data } = await query
  return (data ?? []) as unknown as TxRow[]
}

export async function getMenuSummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string,
  storeId?: string
): Promise<MenuSummary[]> {
  const txs = await fetchSuccessTxs(supabase, merchantId, from, to, storeId)
  const map = new Map<string, { amount: number; count: number }>()

  for (const tx of txs) {
    const key = tx.menu_name || '(미분류)'
    const cur = map.get(key) ?? { amount: 0, count: 0 }
    map.set(key, { amount: cur.amount + tx.amount, count: cur.count + 1 })
  }

  const totalAmount = txs.reduce((s, t) => s + t.amount, 0)

  return Array.from(map.entries())
    .map(([menu_name, { amount, count }]) => ({
      menu_name,
      total_amount: amount,
      count,
      ratio: totalAmount > 0 ? amount / totalAmount : 0,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
}

export async function getDailySummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string,
  storeId?: string
): Promise<DailySummary[]> {
  const txs = await fetchSuccessTxs(supabase, merchantId, from, to, storeId)
  const map = new Map<string, { amount: number; count: number }>()

  for (const tx of txs) {
    const date = tx.approved_at.slice(0, 10)
    const cur = map.get(date) ?? { amount: 0, count: 0 }
    map.set(date, { amount: cur.amount + tx.amount, count: cur.count + 1 })
  }

  return Array.from(map.entries())
    .map(([date, { amount, count }]) => ({ date, total_amount: amount, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getTerminalSummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string,
  storeId?: string
): Promise<TerminalSummary[]> {
  const txs = await fetchSuccessTxs(supabase, merchantId, from, to, storeId)
  const map = new Map<string, { name: string; term_id: string; amount: number; count: number }>()

  for (const tx of txs) {
    const key = tx.terminal_id
    const terminal = tx.terminals
    const cur = map.get(key)
    if (cur) {
      cur.amount += tx.amount
      cur.count += 1
    } else {
      map.set(key, {
        name: terminal?.name ?? tx.terminal_id,
        term_id: terminal?.term_id ?? '',
        amount: tx.amount,
        count: 1,
      })
    }
  }

  return Array.from(map.entries())
    .map(([terminal_id, { name, term_id, amount, count }]) => ({
      terminal_id,
      terminal_name: name,
      term_id,
      total_amount: amount,
      count,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
}

export async function getTerminalTypeSummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string,
  storeId?: string
): Promise<TerminalTypeSummary[]> {
  const txs = await fetchSuccessTxs(supabase, merchantId, from, to, storeId)
  const map = new Map<string, { amount: number; count: number }>()

  for (const tx of txs) {
    const type = tx.terminals?.terminal_type ?? 'unknown'
    const cur = map.get(type) ?? { amount: 0, count: 0 }
    map.set(type, { amount: cur.amount + tx.amount, count: cur.count + 1 })
  }

  return Array.from(map.entries())
    .map(([terminal_type, { amount, count }]) => ({
      terminal_type,
      label: TERMINAL_TYPE_LABELS[terminal_type] ?? terminal_type,
      total_amount: amount,
      count,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
}

export async function getStoreSummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string
): Promise<StoreSummary[]> {
  const [txs, { data: stores }] = await Promise.all([
    fetchSuccessTxs(supabase, merchantId, from, to),
    supabase.from('stores').select('id, store_name').eq('merchant_id', merchantId),
  ])

  const storeNameMap = new Map((stores ?? []).map(s => [s.id, s.store_name as string]))
  const map = new Map<string, { name: string; amount: number; count: number }>()

  for (const tx of txs) {
    const storeId = tx.terminals?.store_id
    if (!storeId) continue
    const cur = map.get(storeId)
    if (cur) {
      cur.amount += tx.amount
      cur.count += 1
    } else {
      map.set(storeId, { name: storeNameMap.get(storeId) ?? storeId, amount: tx.amount, count: 1 })
    }
  }

  return Array.from(map.entries())
    .map(([store_id, { name, amount, count }]) => ({
      store_id,
      store_name: name,
      total_amount: amount,
      count,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
}

export async function getAnalyticsSummary(
  supabase: SupabaseClient,
  merchantId: string,
  from: string,
  to: string,
  storeId?: string
): Promise<AnalyticsSummary> {
  const txs = await fetchSuccessTxs(supabase, merchantId, from, to, storeId)
  const totalAmount = txs.reduce((s, t) => s + t.amount, 0)
  const totalCount = txs.length
  return {
    totalAmount,
    totalCount,
    avgAmount: totalCount > 0 ? Math.round(totalAmount / totalCount) : 0,
  }
}
