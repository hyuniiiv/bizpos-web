<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# pos (POS 단말기)

## Purpose
POS 단말기 운영을 위한 페이지 섹션입니다. 바코드/카메라 스캔, 결제 처리,
오프라인 모드, 실시간 현황 표시 기능을 제공합니다.
Electron 데스크톱 앱으로도 실행됩니다.

## Key Files

| File | Description |
|------|-------------|
| `layout.tsx` | POS 공통 레이아웃 |
| `page.tsx` | POS 메인 화면 (스캔 대기 상태) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `admin/` | POS 관리자 설정 화면 |

## For AI Agents

### Working In This Directory
- POS는 단말기 디바이스에서 실행되는 클라이언트 위주 화면
- 오프라인 지원: IndexedDB(`lib/db/`) 사용, 온라인 복구 시 동기화
- 상태 관리: `lib/store/posStore.ts` Zustand 스토어
- 디바이스 통신: `lib/device/bridge.ts` (Electron IPC) 또는 `lib/device/serial.ts`

### POS Flow
```
스캔 대기 → 바코드/QR 스캔 → 메뉴 선택 → 결제 처리 → 결제 완료/실패
                                                ↓
                                          오프라인 모드 (IndexedDB 저장)
```

### Testing Requirements
- 실제 단말기 또는 Electron 앱에서 테스트
- 오프라인 시나리오: 네트워크 차단 후 동작 확인

## Dependencies

### Internal
- `components/` - POS 화면 컴포넌트 (BarcodeReader, MenuSelectScreen 등)
- `lib/store/posStore.ts` - POS 상태
- `lib/payment/` - 결제 처리
- `lib/db/` - 오프라인 스토리지
- `lib/device/` - 디바이스 통신

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
