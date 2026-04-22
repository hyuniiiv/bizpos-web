<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# admin (매장 관리자)

## Purpose
매장 관리자가 POS 운영을 관리하는 페이지 섹션입니다.
메뉴 관리, 디바이스 관리, 재고 카운트, 거래 내역 조회를 제공합니다.

## Key Files

| File | Description |
|------|-------------|
| `layout.tsx` | 관리자 공통 레이아웃 |
| `page.tsx` | 관리자 메인 페이지 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `count/` | 재고/수량 카운트 관리 |
| `device/` | POS 디바이스 등록 및 상태 관리 |
| `menus/` | 메뉴 항목 추가/수정/삭제 |
| `transactions/` | 매장 거래 내역 조회 |

## For AI Agents

### Working In This Directory
- 매장 관리자 인증: Supabase 세션 기반 (`middleware.ts`)
- 각 하위 페이지는 해당 도메인 API 라우트와 통신
- 컴포넌트: `components/AdminNav.tsx`, `components/MenuSettingForm.tsx` 등 활용

### Common Patterns
```typescript
// 관리자 페이지 서버 컴포넌트 패턴
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // ...
}
```

## Dependencies

### Internal
- `components/AdminNav.tsx` - 관리자 네비게이션
- `components/MenuSettingForm.tsx` - 메뉴 설정
- `components/DeviceStatus.tsx` - 디바이스 상태
- `app/api/` - 데이터 API

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
