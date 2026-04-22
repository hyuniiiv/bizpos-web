<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# terminal (단말기 인증)

## Purpose
POS 단말기의 JWT 기반 인증 시스템입니다.
단말기 등록, 키 발급, JWT 검증을 담당하며 API 라우트에서 단말기 요청을 인증합니다.

## Key Files

| File | Description |
|------|-------------|
| `auth.ts` | 단말기 인증 로직 (등록, 검증, 갱신) |
| `jwt.ts` | JWT 발급/검증 유틸리티 |

## For AI Agents

### Working In This Directory
- JWT는 서버 사이드에서만 처리 (API Route에서만 사용)
- 단말기 인증 흐름: 단말기 등록 → 키 발급 → JWT 발급 → API 요청 시 검증
- `jose` 라이브러리 사용 (Edge Runtime 호환)

### Auth Flow
```
단말기 → POST /api/device/auth (디바이스 ID + 시크릿)
       → auth.ts 검증
       → jwt.ts로 JWT 발급
       → 이후 요청 헤더: Authorization: Bearer {JWT}
       → API Route에서 jwt.ts로 검증
```

### Common Patterns
```typescript
// API Route에서 단말기 JWT 검증
import { verifyTerminalJWT } from '@/lib/terminal/jwt'

export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  const payload = await verifyTerminalJWT(token)
  if (!payload) return new Response('Unauthorized', { status: 401 })
  // ...
}
```

## Dependencies

### External
- `jose` - JWT 발급/검증 (Edge Runtime 호환)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
