<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# ui (shadcn/ui Components)

## Purpose
shadcn/ui CLI로 생성된 공통 UI 컴포넌트 디렉토리입니다.
Radix UI primitives 기반의 접근성이 보장된 컴포넌트를 제공합니다.

## Key Files

| File | Description |
|------|-------------|
| `button.tsx` | 버튼 컴포넌트 (variant: default, destructive, outline 등) |
| `sonner.tsx` | 토스트 알림 컴포넌트 (sonner 라이브러리) |

## For AI Agents

### Working In This Directory
- **직접 수정 금지**: shadcn/ui CLI로 관리되는 파일
- 새 컴포넌트 추가: `npx shadcn@latest add {component-name}`
- 커스터마이징: `globals.css`의 CSS 변수로 테마 조정

### Adding New shadcn Components
```bash
# bizpos-web 디렉토리에서 실행
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add table
```

### Testing Requirements
- Storybook 없음 - 실제 페이지에서 시각적 확인

## Dependencies

### External
- `@radix-ui/*` - 접근성 기반 헤드리스 UI primitives
- `class-variance-authority` - 컴포넌트 variant 관리
- `clsx` + `tailwind-merge` - 조건부 클래스 병합
- `sonner` - 토스트 알림

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
