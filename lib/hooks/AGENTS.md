<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# hooks (React Custom Hooks)

## Purpose
재사용 가능한 React Custom Hook 모음입니다.
클라이언트 컴포넌트에서 데이터 페칭 및 상태 관리 로직을 추상화합니다.

## Key Files

| File | Description |
|------|-------------|
| `useMerchantKeys.ts` | 가맹점 API 키 목록 조회 및 CRUD 훅 |

## For AI Agents

### Working In This Directory
- 훅 파일명: `use{DomainName}.ts` 패턴
- 클라이언트 컴포넌트 전용 (`'use client'` 환경)
- SWR 또는 직접 fetch 사용

### Common Patterns
```typescript
// Custom Hook 패턴
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useMerchantKeys() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('merchant_keys').select().then(({ data }) => {
      setKeys(data ?? [])
      setLoading(false)
    })
  }, [])

  return { keys, loading }
}
```

## Dependencies

### Internal
- `lib/supabase/client.ts` - 클라이언트 사이드 DB

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
