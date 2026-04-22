import { createClient } from '@supabase/supabase-js'

// 비밀번호 검증 전용 클라이언트 — persistSession: false로 세션 쿠키 부작용 방지
export function createVerifyClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
