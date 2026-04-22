<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# dashboard (본사 대시보드)

## Purpose
본사/관리자가 전체 가맹점과 단말기를 모니터링하는 대시보드 섹션입니다.
실시간 알림, 매출 분석, 단말기 관리, 가맹점 키 관리를 제공합니다.

## Key Files

| File | Description |
|------|-------------|
| `layout.tsx` | 대시보드 공통 레이아웃 |
| `page.tsx` | 대시보드 메인 페이지 |
| `LogoutButton.tsx` | 로그아웃 버튼 컴포넌트 |
| `SetupMerchant.tsx` | 가맹점 초기 설정 컴포넌트 |
| `AddTerminalButton.tsx` | 단말기 추가 버튼 |
| `DateFilter.tsx` | 날짜 필터 컴포넌트 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `alerts/` | 이상 감지 알림 페이지 |
| `analytics/` | 매출 분석 페이지 |
| `keys/` | 가맹점 키 관리 페이지 |
| `settings/` | 설정 페이지 |
| `terminals/` | 단말기 관리 페이지 |
| `transactions/` | 전체 거래 내역 페이지 |

## For AI Agents

### Working In This Directory
- 대시보드 접근: Supabase 인증 필요 (`middleware.ts`로 보호)
- 서버 컴포넌트에서 초기 데이터 로드 후 클라이언트 컴포넌트(`*Client.tsx`)로 전달
- 실시간 기능: Supabase Realtime 구독 사용

### Common Patterns
```typescript
// 서버 컴포넌트에서 데이터 로드
import { createServerClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data } = await supabase.from('table').select()
  return <DashboardClient initialData={data} />
}
```

## Dependencies

### Internal
- `components/DashboardClient.tsx` - 메인 클라이언트 컴포넌트
- `components/AnalyticsClient.tsx` - 분석 클라이언트
- `components/TerminalListClient.tsx` - 단말기 목록
- `lib/analytics/queries.ts` - 분석 쿼리
- `lib/anomaly/detector.ts` - 이상 감지

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
