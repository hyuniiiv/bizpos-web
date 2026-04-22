import { createAdminClient } from './admin'

// N개 개별 getUserById 호출 대신 listUsers 1회 호출로 이메일 맵 생성 (N+1 방지)
export async function getEmailMapByIds(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {}
  const admin = createAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const idSet = new Set(userIds)
  return Object.fromEntries(
    users
      .filter(u => idSet.has(u.id))
      .map(u => [u.id, u.email ?? '(알 수 없음)'])
  )
}
