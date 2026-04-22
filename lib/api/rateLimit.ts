interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()

  // 만료된 엔트리 eviction (메모리 누적 방지)
  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k)
    }
  }

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  store.set(key, { ...entry, count: entry.count + 1 })
  return { allowed: true }
}

export function getRateLimitKey(_req: unknown, suffix: string): string {
  // Electron: all connections are local, no trusted proxy — use fixed local key
  return `127.0.0.1:${suffix}`
}
