export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-white/10 rounded" />
        <div className="h-9 w-72 bg-white/10 rounded-lg" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl px-5 py-4 bg-white/5 h-20" />
        ))}
      </div>

      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-5">
          <div className="h-5 w-24 bg-white/10 rounded mb-4" />
          <div className="h-48 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  )
}
