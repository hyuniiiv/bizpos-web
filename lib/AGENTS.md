<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# lib (Business Logic & Utilities)

## Purpose
애플리케이션의 핵심 비즈니스 로직, 유틸리티, 외부 서비스 통합을 담당하는 디렉토리입니다.
도메인별로 세분화된 모듈 구조를 가지며 API 라우트와 컴포넌트에서 공유합니다.

## Key Files

| File | Description |
|------|-------------|
| `utils.ts` | 공통 유틸리티 함수 (cn, 포맷팅 등) |
| `configSync.ts` | 설정 동기화 로직 |
| `onlineSync.ts` | 온라인 상태 동기화 |
| `txSync.ts` | 거래 데이터 동기화 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `analytics/` | 분석 쿼리 (see `analytics/AGENTS.md`) |
| `anomaly/` | 이상 감지 알고리즘 (see `anomaly/AGENTS.md`) |
| `api/` | API 에러 처리 유틸리티 |
| `db/` | IndexedDB 오프라인 스토리지 (see `db/AGENTS.md`) |
| `device/` | 디바이스 통신 브릿지 (see `device/AGENTS.md`) |
| `hooks/` | React Custom Hooks |
| `payment/` | 결제 처리 로직 (see `payment/AGENTS.md`) |
| `store/` | Zustand 상태 관리 (see `store/AGENTS.md`) |
| `supabase/` | Supabase 클라이언트 초기화 (see `supabase/AGENTS.md`) |
| `terminal/` | 단말기 인증/JWT (see `terminal/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 새 도메인 로직: 적절한 하위 디렉토리 생성 또는 기존 디렉토리에 파일 추가
- 서버 전용 코드: Next.js 서버 컴포넌트/라우트에서만 import 가능한 모듈 주의
- 클라이언트/서버 구분:
  - `lib/supabase/client.ts` → 클라이언트 전용
  - `lib/supabase/server.ts` → 서버 전용
  - `lib/supabase/admin.ts` → 서버 전용 (서비스 롤 키 사용)

### Common Patterns
```typescript
// 서버 전용 함수 (API Route, Server Component에서만 사용)
import { createServerClient } from '@/lib/supabase/server'

// 클라이언트 전용 함수 (Client Component에서 사용)
import { createClient } from '@/lib/supabase/client'

// 에러 처리 패턴
import { createApiError } from '@/lib/api/error'
```

### Testing Requirements
- 각 도메인 모듈은 API 라우트를 통해 간접 테스트
- 결제 모듈(`payment/`)은 Bizplay API 연결 필요

## Dependencies

### Internal
- `types/` - 공유 TypeScript 타입

### External
- `@supabase/supabase-js` - DB 및 인증
- `idb` - IndexedDB 래퍼
- `jose` / `jsonwebtoken` - JWT 처리

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
