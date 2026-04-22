<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# components (React Components)

## Purpose
재사용 가능한 React 컴포넌트 모음입니다. POS, 관리자, 대시보드, 분석의 4개 도메인과
shadcn/ui 기반의 공통 UI 컴포넌트(`ui/`)로 구성됩니다.

## Key Files

### Admin Components
| File | Description |
|------|-------------|
| `AdminNav.tsx` | 관리자 사이드 네비게이션 |
| `DeviceStatus.tsx` | 디바이스 상태 표시 위젯 |
| `MenuSettingForm.tsx` | 메뉴 설정 폼 |
| `RealtimeTable.tsx` | 실시간 거래 테이블 |
| `SummaryBar.tsx` | 요약 통계 바 |
| `TransactionRow.tsx` | 거래 내역 행 컴포넌트 |

### Analytics Components
| File | Description |
|------|-------------|
| `AnalyticsClient.tsx` | 분석 페이지 클라이언트 컴포넌트 |
| `DailyLineChart.tsx` | 일별 매출 선 차트 (recharts) |
| `DateRangeFilter.tsx` | 날짜 범위 필터 |
| `MenuPieChart.tsx` | 메뉴별 파이 차트 |
| `SummaryCards.tsx` | 분석 요약 카드 |
| `TerminalBarChart.tsx` | 단말기별 막대 차트 |

### Dashboard Components
| File | Description |
|------|-------------|
| `DashboardClient.tsx` | 대시보드 메인 클라이언트 컴포넌트 |
| `MerchantKeyClient.tsx` | 가맹점 키 관리 클라이언트 |
| `TerminalListClient.tsx` | 단말기 목록 클라이언트 |

### POS Components
| File | Description |
|------|-------------|
| `ActivationScreen.tsx` | 단말기 활성화 화면 |
| `BarcodeReader.tsx` | 바코드 스캔 컴포넌트 |
| `CameraReader.tsx` | 카메라 기반 QR/바코드 리더 |
| `CountDisplay.tsx` | 카운트 표시 |
| `FailScreen.tsx` | 결제 실패 화면 |
| `MenuCard.tsx` | 메뉴 카드 컴포넌트 |
| `MenuSelectScreen.tsx` | 메뉴 선택 화면 |
| `OfflineScreen.tsx` | 오프라인 모드 화면 |
| `ProcessingScreen.tsx` | 결제 처리 중 화면 |
| `RealTimeDashboard.tsx` | 실시간 현황 대시보드 |
| `ScanLogBar.tsx` | 스캔 로그 표시 바 |
| `ScanWaitScreen.tsx` | 스캔 대기 화면 |
| `SingleMenuScreen.tsx` | 단일 메뉴 화면 |
| `StatusBar.tsx` | POS 상태 바 |
| `SuccessScreen.tsx` | 결제 성공 화면 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `ui/` | shadcn/ui 기반 공통 UI 컴포넌트 |

## For AI Agents

### Working In This Directory
- 새 컴포넌트: 도메인에 맞는 파일명으로 직접 생성 (서브디렉토리 불필요)
- `ui/` 디렉토리: shadcn/ui CLI로 추가 (`npx shadcn@latest add {component}`)
- 클라이언트 컴포넌트: 파일 최상단에 `'use client'` 선언
- Props 인터페이스: 컴포넌트 위에 정의

### Common Patterns
```typescript
// 클라이언트 컴포넌트 패턴
'use client'
import { useState } from 'react'

interface Props {
  data: DataType
  onAction?: (id: string) => void
}

export function ComponentName({ data, onAction }: Props) {
  // ...
}
```

### Testing Requirements
- 컴포넌트 렌더링 확인은 실제 페이지에서 시각적으로 검증
- 인터랙션은 브라우저에서 확인

## Dependencies

### Internal
- `lib/store/` - Zustand 상태 (POS 컴포넌트)
- `lib/payment/` - 결제 로직 (POS 컴포넌트)
- `types/` - TypeScript 타입

### External
- `recharts` - 차트 (Analytics 컴포넌트)
- `@radix-ui/*` - 접근성 기반 UI primitives
- `lucide-react` - 아이콘

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
