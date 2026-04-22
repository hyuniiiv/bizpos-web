<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# api (API 유틸리티)

## Purpose
API 라우트 전반에서 공통으로 사용하는 에러 처리 유틸리티입니다.
일관된 에러 응답 형식을 보장합니다.

## Key Files

| File | Description |
|------|-------------|
| `error.ts` | 표준 API 에러 응답 생성 유틸리티 |

## For AI Agents

### Working In This Directory
- 모든 API Route에서 에러 처리 시 이 모듈 사용 (일관성 유지)
- `error-response-unify` 피처에 의해 도입된 표준화 모듈

### Common Patterns
```typescript
import { createApiError } from '@/lib/api/error'

export async function POST(request: Request) {
  try {
    // 로직...
  } catch (error) {
    return createApiError(error)
    // 표준 형식: { error: { code, message }, status: 4xx/5xx }
  }
}
```

## Dependencies
- 없음 (순수 유틸리티)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
