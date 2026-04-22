<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# payment (결제 처리)

## Purpose
Bizplay 결제 게이트웨이와의 통신을 담당하는 핵심 비즈니스 로직 모듈입니다.
결제 승인, 취소, 바코드 파싱, 암호화, 오더 관리를 포함합니다.

## Key Files

| File | Description |
|------|-------------|
| `bizplay.ts` | Bizplay API 통신 클라이언트 |
| `getBizplayClient.ts` | Bizplay 클라이언트 팩토리/싱글톤 |
| `barcode.ts` | 바코드 파싱 및 검증 로직 |
| `crypto.ts` | 결제 데이터 암호화/복호화 |
| `order.ts` | 주문 생성 및 관리 |

## For AI Agents

### Working In This Directory
- **외부 API 의존**: Bizplay API 키 환경변수 필요
- 결제 흐름: `order.ts` → `getBizplayClient.ts` → `bizplay.ts` → Bizplay API
- 암호화: `crypto.ts`에서 결제 데이터 보호 (AES 등)
- 바코드: `barcode.ts`에서 EAN, QR 등 다양한 형식 파싱

### Environment Variables
```
BIZPLAY_API_KEY=...
BIZPLAY_API_SECRET=...
BIZPLAY_API_URL=...
```

### Common Patterns
```typescript
import { getBizplayClient } from '@/lib/payment/getBizplayClient'

const client = getBizplayClient()
const result = await client.approve({
  orderId: order.id,
  amount: order.amount,
  barcode: scannedBarcode
})
```

### Testing Requirements
- Bizplay 테스트 환경(샌드박스) 사용
- 실제 결제는 절대 테스트에 사용하지 말 것

## Dependencies

### External
- Bizplay API - 결제 게이트웨이
- `crypto` (Node.js 내장) - 암호화

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
