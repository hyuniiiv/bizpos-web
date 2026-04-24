// 역할 계층 정의 — 각 역할이 부여/관리할 수 있는 역할 목록
// API 라우트와 클라이언트 컴포넌트 모두 이 파일에서 import

export const MERCHANT_ASSIGNABLE: Record<string, string[]> = {
  platform_admin: ['platform_admin', 'platform_manager', 'merchant_admin', 'merchant_manager', 'store_admin', 'store_manager', 'terminal_admin'],
  platform_manager: [],
  merchant_admin: ['merchant_manager', 'store_admin', 'store_manager', 'terminal_admin'],
  merchant_manager: ['store_manager', 'terminal_admin'],
  store_admin: ['store_manager', 'terminal_admin'],
  store_manager: ['terminal_admin'],
  terminal_admin: [],
}

export const MERCHANT_PLATFORM_ROLES = new Set(['platform_admin', 'platform_manager'])

export const CLIENT_ASSIGNABLE: Record<string, string[]> = {
  platform_admin: ['platform_admin', 'platform_manager', 'client_admin', 'client_manager'],
  client_admin: ['client_manager'],
  client_manager: [],
}

export const CLIENT_PLATFORM_ROLES = new Set(['platform_admin', 'platform_manager'])

// 이메일 링크가 아닌 ID/PW로 생성되는 역할 (비밀번호 재설정 대상)
export const NEEDS_PASSWORD_ROLES = new Set([
  'merchant_admin', 'merchant_manager', 'store_admin', 'store_manager', 'terminal_admin', 'client_admin', 'client_manager',
])
