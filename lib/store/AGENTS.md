<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# store (Zustand State Management)

## Purpose
Zustand 기반의 클라이언트 사이드 상태 관리 스토어입니다.
POS 운영 상태, 메뉴 데이터, 앱 설정을 각각 분리된 스토어로 관리합니다.

## Key Files

| File | Description |
|------|-------------|
| `posStore.ts` | POS 단말기 운영 상태 (스캔, 결제, 화면 전환) |
| `menuStore.ts` | 메뉴 데이터 및 선택 상태 |
| `settingsStore.ts` | 앱 설정 (단말기 ID, 가맹점 정보 등) |

## For AI Agents

### Working In This Directory
- 새 스토어: 도메인별 별도 파일로 분리
- 클라이언트 컴포넌트에서만 사용 가능 (`'use client'`)
- 지속성 필요 시: Zustand `persist` 미들웨어 + localStorage/IndexedDB

### Common Patterns
```typescript
// Zustand 스토어 패턴
import { create } from 'zustand'

interface PosState {
  screen: 'wait' | 'scanning' | 'processing' | 'success' | 'fail'
  currentOrder: Order | null
  setScreen: (screen: PosState['screen']) => void
}

export const usePosStore = create<PosState>((set) => ({
  screen: 'wait',
  currentOrder: null,
  setScreen: (screen) => set({ screen }),
}))

// 컴포넌트에서 사용
const { screen, setScreen } = usePosStore()
```

### Testing Requirements
- 스토어 액션 호출 후 상태 변화 확인
- React DevTools Zustand 플러그인으로 디버깅

## Dependencies

### External
- `zustand` - 상태 관리 라이브러리

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
