<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# types (TypeScript Type Definitions)

## Purpose
프로젝트 전체에서 공유되는 TypeScript 타입 정의 파일 모음입니다.
도메인별로 분리된 타입 파일을 포함하며 `@/types/*`로 import합니다.

## Key Files

| File | Description |
|------|-------------|
| `menu.ts` | 메뉴 및 카테고리 타입 |
| `merchant-key.ts` | 가맹점 키 관련 타입 |
| `online.ts` | 온라인 상태 및 동기화 타입 |
| `payment.ts` | 결제 요청/응답 타입 (Bizplay API 형식 포함) |
| `supabase.ts` | Supabase DB 스키마 자동 생성 타입 |

## For AI Agents

### Working In This Directory
- 새 타입 추가: 도메인에 맞는 기존 파일에 추가하거나 새 파일 생성
- `supabase.ts`: Supabase CLI로 자동 생성 (`supabase gen types typescript`)
  - **직접 수정 금지** - DB 스키마 변경 후 재생성
- 공유 타입은 여기에 정의, 컴포넌트/함수 전용 타입은 해당 파일에 정의

### Common Patterns
```typescript
// 타입 export 패턴
export interface MenuType {
  id: string
  name: string
  price: number
  category: string
}

export type PaymentStatus = 'pending' | 'approved' | 'cancelled' | 'failed'
```

### Testing Requirements
- TypeScript 컴파일 오류 없는지 확인: `tsc --noEmit`

## Dependencies

### External
- Supabase CLI - `supabase.ts` 자동 생성

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
