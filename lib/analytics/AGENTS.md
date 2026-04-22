<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# analytics (분석 쿼리)

## Purpose
매출 분석 데이터를 Supabase에서 조회하는 쿼리 모듈입니다.
일별/메뉴별/단말기별 집계 데이터를 제공하며 대시보드 분석 페이지에서 사용합니다.

## Key Files

| File | Description |
|------|-------------|
| `queries.ts` | Supabase 분석 쿼리 함수 모음 |

## For AI Agents

### Working In This Directory
- 서버 사이드 전용 (Supabase 서버 클라이언트 사용)
- 날짜 범위, 가맹점 ID, 단말기 ID로 필터링
- 결과는 `components/AnalyticsClient.tsx`에서 차트로 렌더링

### Query Functions Pattern
```typescript
// queries.ts 패턴
import { createAdminClient } from '@/lib/supabase/admin'

export async function getDailyRevenue(startDate: string, endDate: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
  // 집계 처리...
  return aggregated
}
```

### Testing Requirements
- 실제 Supabase DB에서 쿼리 결과 확인
- 날짜 범위 엣지케이스 테스트

## Dependencies

### Internal
- `lib/supabase/admin.ts` - DB 쿼리 클라이언트

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
