// lib/settlement/generatePdf.tsx
import React from 'react'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Settlement, SettlementItem } from '@/types/menu'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 11, color: '#666666', marginBottom: 20 },
  table: { display: 'flex', flexDirection: 'column', borderWidth: 1, borderColor: '#dddddd' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#dddddd' },
  headerRow: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#dddddd' },
  totalRow: { flexDirection: 'row', backgroundColor: '#fffde7' },
  cell: { padding: '4 6', flex: 1 },
  cellRight: { padding: '4 6', flex: 1, textAlign: 'right' },
})

export async function generateSettlementPdf(
  settlement: Settlement,
  items: SettlementItem[],
): Promise<Buffer> {
  const doc = React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.title }, '식수 정산서'),
      React.createElement(Text, { style: styles.subtitle }, `기간: ${settlement.period_start} ~ ${settlement.period_end}`),
      React.createElement(View, { style: styles.table },
        React.createElement(View, { style: styles.headerRow },
          ...(['사원번호', '이름', '부서', '조식', '중식', '석식', '합계', '금액'].map(h =>
            React.createElement(Text, { key: h, style: styles.cell }, h)
          ))
        ),
        ...items.map(item =>
          React.createElement(View, { key: item.id, style: styles.row },
            React.createElement(Text, { style: styles.cell }, item.employee_no),
            React.createElement(Text, { style: styles.cell }, item.employee_name),
            React.createElement(Text, { style: styles.cell }, item.department ?? ''),
            React.createElement(Text, { style: styles.cellRight }, String(item.breakfast_count)),
            React.createElement(Text, { style: styles.cellRight }, String(item.lunch_count)),
            React.createElement(Text, { style: styles.cellRight }, String(item.dinner_count)),
            React.createElement(Text, { style: styles.cellRight }, String(item.usage_count)),
            React.createElement(Text, { style: styles.cellRight }, item.total_amount.toLocaleString('ko-KR')),
          )
        ),
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.cell }, '합계'),
          React.createElement(Text, { style: styles.cell }, ''),
          React.createElement(Text, { style: styles.cell }, ''),
          React.createElement(Text, { style: styles.cellRight }, String(items.reduce((s, i) => s + i.breakfast_count, 0))),
          React.createElement(Text, { style: styles.cellRight }, String(items.reduce((s, i) => s + i.lunch_count, 0))),
          React.createElement(Text, { style: styles.cellRight }, String(items.reduce((s, i) => s + i.dinner_count, 0))),
          React.createElement(Text, { style: styles.cellRight }, String(settlement.total_count)),
          React.createElement(Text, { style: styles.cellRight }, settlement.total_amount.toLocaleString('ko-KR')),
        )
      )
    )
  )

  return renderToBuffer(doc)
}
