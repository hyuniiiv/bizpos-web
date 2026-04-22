'use client'

export function DateFilter({ value }: { value: string }) {
  return (
    <input
      type="date"
      defaultValue={value}
      onChange={e => {
        const url = new URL(window.location.href)
        url.searchParams.set('date', e.target.value)
        window.location.href = url.toString()
      }}
      className="rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
      style={{ background: 'var(--bp-surface-2)', border: '1px solid var(--bp-border)', colorScheme: 'dark' } as React.CSSProperties}
    />
  )
}
