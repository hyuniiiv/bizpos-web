import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

configure({
  asyncUtilTimeout: 1000,
})

if (typeof window !== 'undefined' && !window.getComputedRole) {
  // Enable jsdom accessibility API for role queries
  Object.defineProperty(window, 'getComputedRole', {
    value: (element: Element) => {
      return element.getAttribute('role') || ''
    },
    writable: true,
    configurable: true,
  })
}

// 각 테스트 후 cleanup
afterEach(() => {
  cleanup()
})

// localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Next.js useRouter mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Supabase client mock
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
      unsubscribe: vi.fn(),
    }),
  }),
}))
