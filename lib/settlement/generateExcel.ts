// lib/settlement/generateExcel.ts
import * as XLSX from 'xlsx'
import type { Settlement, SettlementItem } from '@/types/menu'

export async function generateSettlementExcel(
  settlement: Settlement,
  items: SettlementItem[],
): Promise<Buffer> {
  const wb = XLSX.utils.book_new()

  const headerRow = ['사원번호', '이름', '부서', '조식', '중식', '석식', '합계횟수', '합계금액(원)']
  const dataRows = items.map(item => [
    item.employee_no,
    item.employee_name,
    item.department ?? '',
    item.breakfast_count,
    item.lunch_count,
    item.dinner_count,
    item.usage_count,
    item.total_amount,
  ])

  const totalRow = [
    '합계', '', '',
    items.reduce((s, i) => s + i.breakfast_count, 0),
    items.reduce((s, i) => s + i.lunch_count, 0),
    items.reduce((s, i) => s + i.dinner_count, 0),
    settlement.total_count,
    settlement.total_amount,
  ]

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows, totalRow])
  ws['!cols'] = [12, 10, 12, 6, 6, 6, 10, 14].map(wch => ({ wch }))

  XLSX.utils.book_append_sheet(wb, ws, '정산내역')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return buf
}
