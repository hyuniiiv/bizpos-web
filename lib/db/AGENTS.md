<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# db (IndexedDB Offline Storage)

## Purpose
브라우저 IndexedDB를 이용한 오프라인 데이터 스토리지 모듈입니다.
POS 단말기가 네트워크 연결 없이도 거래를 처리하고 나중에 동기화할 수 있도록 지원합니다.

## Key Files

| File | Description |
|------|-------------|
| `indexeddb.ts` | IndexedDB CRUD 작업 (거래 저장/조회/삭제) |
| `schema.ts` | IndexedDB 스키마 정의 (DB 이름, 버전, 스토어) |

## For AI Agents

### Working In This Directory
- IndexedDB는 브라우저 전용 (`'use client'` 컴포넌트 또는 클라이언트 훅에서만 사용)
- 서버 컴포넌트나 API Route에서 import 금지
- 오프라인 거래는 `txSync.ts`로 온라인 복구 시 Supabase에 동기화

### Common Patterns
```typescript
// 오프라인 거래 저장
import { saveOfflineTransaction } from '@/lib/db/indexeddb'

await saveOfflineTransaction({
  id: orderId,
  amount: totalAmount,
  items: selectedMenus,
  timestamp: Date.now()
})

// 동기화 대기 중인 거래 조회
import { getPendingTransactions } from '@/lib/db/indexeddb'
const pending = await getPendingTransactions()
```

### Testing Requirements
- 브라우저 DevTools → Application → IndexedDB에서 데이터 확인
- 네트워크 오프라인 시뮬레이션 후 저장 확인

## Dependencies

### Internal
- `lib/txSync.ts` - 온라인 복구 시 동기화

### External
- `idb` - IndexedDB Promise 래퍼

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
