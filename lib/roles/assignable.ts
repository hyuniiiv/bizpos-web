// 역할 계층 정의 — 각 역할이 부여/관리할 수 있는 역할 목록
// API 라우트와 클라이언트 컴포넌트 모두 이 파일에서 import

export const MERCHANT_ASSIGNABLE: Record<string, string[]> = {
  platform_store_admin: ['platform_store_admin', 'store_owner', 'store_manager'],
  store_owner: ['store_manager'],
  store_manager: [],
}

export const MERCHANT_PLATFORM_ROLES = new Set(['platform_store_admin'])

export const CLIENT_ASSIGNABLE: Record<string, string[]> = {
  platform_client_admin: ['platform_client_admin', 'client_admin', 'client_operator'],
  client_admin: ['client_operator'],
  client_operator: [],
}

export const CLIENT_PLATFORM_ROLES = new Set(['platform_client_admin'])

// 이메일 링크가 아닌 ID/PW로 생성되는 역할 (비밀번호 재설정 대상)
export const NEEDS_PASSWORD_ROLES = new Set([
  'store_owner', 'store_manager', 'client_admin', 'client_operator',
])
