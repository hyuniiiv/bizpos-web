import { Page } from '@playwright/test'

export interface TestUser {
  email?: string
  id?: string
  password: string
  role: string
  name: string
}

// Mock test accounts with different roles
export const TEST_USERS = {
  platform_admin: {
    email: 'platform@test.com',
    password: 'Platform@123',
    role: 'platform_admin',
    name: 'Platform Admin',
  },
  merchant_admin: {
    id: 'merchant_admin_01',
    password: 'Merchant@123',
    role: 'merchant_admin',
    name: 'Merchant Admin',
  },
  store_admin: {
    id: 'store_admin_01',
    password: 'Store@123',
    role: 'store_admin',
    name: 'Store Admin',
  },
  terminal_admin: {
    id: 'terminal_admin_01',
    password: 'Terminal@123',
    role: 'terminal_admin',
    name: 'Terminal Admin',
  },
} as const

/**
 * Mock login - Sets auth token in localStorage
 * In a real scenario, this would interact with actual auth API
 */
export async function mockLogin(page: Page, user: TestUser) {
  // Set auth token and user info in localStorage
  await page.evaluate((userData) => {
    localStorage.setItem('auth_token', 'mock-token-' + userData.role)
    localStorage.setItem('user_info', JSON.stringify({
      id: userData.id || userData.email,
      email: userData.email,
      role: userData.role,
      name: userData.name,
    }))
  }, user)

  // Navigate to dashboard
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

/**
 * Login via UI form (alternative approach if using actual auth UI)
 */
export async function loginViaUI(page: Page, user: TestUser) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  if (user.email) {
    // Platform roles use email
    await page.fill('input[type="email"]', user.email)
  } else if (user.id) {
    // Non-platform roles use ID
    await page.fill('input[placeholder*="ID"], input[id*="id"]', user.id)
  }

  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')
  await page.waitForNavigation()
  await page.waitForLoadState('networkidle')
}

/**
 * Logout from the application
 */
export async function logout(page: Page) {
  // Click logout button or clear auth
  await page.evaluate(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
  })
  await page.goto('/')
}
