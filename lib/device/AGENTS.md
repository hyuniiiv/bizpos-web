<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# device (디바이스 통신)

## Purpose
POS 단말기 하드웨어와의 통신 모듈입니다.
Electron IPC 브릿지와 Web Serial API를 통해 바코드 리더, 결제 단말기 등 주변 장치와 통신합니다.

## Key Files

| File | Description |
|------|-------------|
| `bridge.ts` | Electron IPC 브릿지 (데스크톱 앱 전용 디바이스 통신) |
| `serial.ts` | Web Serial API 기반 시리얼 포트 통신 |

## For AI Agents

### Working In This Directory
- `bridge.ts`: Electron 환경에서만 동작, 브라우저 환경 폴백 처리 필요
- `serial.ts`: Chrome/Edge 등 Web Serial API 지원 브라우저 전용
- 환경 감지: `typeof window !== 'undefined' && window.electron` 패턴

### Common Patterns
```typescript
// Electron 환경 감지
const isElectron = typeof window !== 'undefined' &&
  typeof (window as any).electron !== 'undefined'

if (isElectron) {
  // Electron IPC 통신
  const result = await bridge.sendCommand('read-barcode')
} else {
  // Web Serial API 폴백
  await serial.connect()
}
```

### Testing Requirements
- Electron 앱 빌드 후 실제 디바이스 연결 테스트
- Web Serial: Chrome DevTools Protocol로 시뮬레이션 가능

## Dependencies

### Internal
- `electron/` - Electron 메인 프로세스 IPC 핸들러

### External
- Web Serial API (브라우저 내장)
- Electron IPC (Electron 내장)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
