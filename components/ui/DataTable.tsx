import type { ReactNode } from 'react'

export type TableColumn = {
  label: ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' }

export function DataTable({
  columns,
  isEmpty,
  empty = '데이터가 없습니다.',
  children,
}: {
  columns: TableColumn[]
  isEmpty?: boolean
  empty?: ReactNode
  children: ReactNode
}) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <tr>
          {columns.map((col, i) => (
            <th
              key={i}
              className={`${ALIGN[col.align ?? 'left']} px-4 py-3 text-white/50 ${col.className ?? ''}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isEmpty ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-white/40">
              {empty}
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  )
}

export function DataTableRow({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: React.MouseEventHandler<HTMLTableRowElement>
}) {
  return (
    <tr
      className={`border-t border-white/5 hover:bg-white/5 transition-colors${onClick ? ' cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}
