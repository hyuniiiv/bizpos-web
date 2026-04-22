import { createAdminClient } from '@/lib/supabase/admin'
import type { Employee } from '@/types/menu'

export type LookupResult =
  | { found: true; employee: Employee }
  | { found: false }

/**
 * card_number 또는 barcode로 사원을 조회한다. (employees는 client_id 소속)
 */
export async function lookupEmployee(
  rawInput: string,
): Promise<LookupResult> {
  const supabase = createAdminClient()
  const safe = rawInput.replace(/[,().'"\s]/g, '')
  if (!safe) return { found: false }
  const { data, error } = await supabase
    .from('employees')
    .select('id, client_id, name, department, is_active')
    .eq('is_active', true)
    .or(`card_number.eq.${safe},barcode.eq.${safe}`)
    .maybeSingle()

  if (error || !data) return { found: false }
  return { found: true, employee: data as Employee }
}
