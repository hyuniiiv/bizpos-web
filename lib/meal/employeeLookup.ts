import { createAdminClient } from '@/lib/supabase/admin'
import type { Employee } from '@/types/menu'

export type LookupResult =
  | { found: true; employee: Employee }
  | { found: false }

/**
 * merchantId 범위 내에서 card_number 또는 barcode로 사원을 조회한다.
 */
export async function lookupEmployee(
  merchantId: string,
  rawInput: string,
): Promise<LookupResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .or(`card_number.eq.${rawInput},barcode.eq.${rawInput}`)
    .maybeSingle()

  if (error || !data) return { found: false }
  return { found: true, employee: data as Employee }
}
