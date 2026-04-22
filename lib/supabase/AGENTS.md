<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# supabase (Supabase Client Initialization)

## Purpose
Supabase 클라이언트 초기화 모듈입니다. 서버/클라이언트/관리자 3가지 환경에 맞는
클라이언트를 제공하며 각각 용도와 권한이 다릅니다.

**주의**: 이 디렉토리(`lib/supabase/`)는 클라이언트 코드이며,
DB 스키마/마이그레이션은 `bizpos-web/supabase/`에 있습니다.

## Key Files

| File | Description |
|------|-------------|
| `client.ts` | 브라우저 클라이언트 (anon key, RLS 적용) |
| `server.ts` | 서버 컴포넌트/API Route용 클라이언트 (세션 쿠키 기반) |
| `admin.ts` | 서비스 롤 클라이언트 (RLS 우회, 관리자 전용) |

## For AI Agents

### Working In This Directory
- **절대 규칙**: `admin.ts`는 API Route 서버 측에서만 사용 (클라이언트 번들에 포함 금지)
- `client.ts`: `'use client'` 컴포넌트에서 import
- `server.ts`: 서버 컴포넌트, API Route에서 import

### Usage Patterns
```typescript
// 클라이언트 컴포넌트
'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// 서버 컴포넌트 / API Route
import { createServerClient } from '@/lib/supabase/server'
const supabase = await createServerClient()

// 관리자 작업 (API Route 서버 측 전용)
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
```

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← admin.ts 전용, 절대 클라이언트 노출 금지
```

### Testing Requirements
- Supabase 로컬 개발: `supabase start`
- 환경변수 `.env.local` 설정 확인

## Dependencies

### External
- `@supabase/supabase-js` - Supabase JS SDK
- `@supabase/ssr` - Next.js SSR 쿠키 처리

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
