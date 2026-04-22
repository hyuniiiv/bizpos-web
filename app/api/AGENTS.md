<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# api (Next.js API Routes)

## Purpose
Next.js App Router 기반의 서버리스 API 엔드포인트입니다.
디바이스 인증, 결제 처리, 가맹점/단말기 관리, 거래 내역 등 25개 이상의 엔드포인트를 제공합니다.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `health/` | 헬스체크 엔드포인트 |
| `settings/` | 앱 설정 CRUD |
| `terminals/` | 단말기 관리 (활성화, 설정, 키, 폐기) |
| `transactions/` | 거래 내역 (배치, 실시간) |
| `device/` | 디바이스 인증/활성화/설정/하트비트 |
| `merchant/` | 가맹점 관리 |
| `payment/` | 결제 처리 (승인, 취소, 예약, 결과, 오프라인) |
| `setup/` | 초기 가맹점 설정 |
| `alerts/` | 이상 감지 알림 |

## API Endpoint Map

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | 서버 상태 확인 |
| GET/POST | `/api/settings` | 설정 조회/저장 |
| GET/POST | `/api/terminals` | 단말기 목록/등록 |
| GET/PUT/DELETE | `/api/terminals/[id]` | 단말기 개별 관리 |
| POST | `/api/terminals/[id]/account` | 단말기 계정 연결 |
| GET/PUT | `/api/terminals/[id]/config` | 단말기 설정 |
| POST | `/api/terminals/[id]/key` | 키 발급 |
| POST | `/api/terminals/[id]/revoke` | 키 폐기 |
| GET | `/api/transactions` | 거래 내역 조회 |
| POST | `/api/transactions/batch` | 배치 거래 처리 |
| GET | `/api/transactions/realtime` | 실시간 거래 스트림 |
| POST | `/api/device/auth` | 디바이스 인증 |
| POST | `/api/device/activate` | 디바이스 활성화 |
| GET/PUT | `/api/device/config` | 디바이스 설정 |
| POST | `/api/device/heartbeat` | 하트비트 |
| GET | `/api/merchant/keys` | 가맹점 키 목록 |
| POST | `/api/merchant/keys` | 키 생성 |
| DELETE | `/api/merchant/keys/[id]` | 키 삭제 |
| POST | `/api/payment/approve` | 결제 승인 |
| POST | `/api/payment/cancel` | 결제 취소 |
| POST | `/api/payment/reserve` | 결제 예약 |
| GET | `/api/payment/result` | 결제 결과 조회 |
| POST | `/api/payment/offline` | 오프라인 결제 |
| POST | `/api/payment/cancel-request` | 취소 요청 |
| POST | `/api/setup/merchant` | 가맹점 초기 설정 |
| GET/PUT | `/api/alerts/[id]` | 알림 개별 관리 |

## For AI Agents

### Working In This Directory
- 새 API 라우트: `app/api/{domain}/route.ts` 파일 생성
- 파일 구조: `export async function GET/POST/PUT/DELETE(request: Request)`
- 인증 필요 라우트: JWT 검증 (`lib/terminal/jwt.ts`) 또는 Supabase 세션 확인
- 에러 응답: `lib/api/error.ts`의 표준 에러 형식 사용

### Common Patterns
```typescript
// API Route 기본 패턴
import { NextResponse } from 'next/server'
import { createApiError } from '@/lib/api/error'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // 로직 처리
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return createApiError(error)
  }
}
```

### Testing Requirements
- Zero Script QA: 실제 HTTP 요청으로 검증
- 인증이 필요한 엔드포인트: 유효한 JWT 또는 세션 토큰 포함

## Dependencies

### Internal
- `lib/supabase/server.ts` - 서버 사이드 DB
- `lib/supabase/admin.ts` - 관리자 권한 DB 접근
- `lib/payment/` - 결제 처리
- `lib/terminal/` - 단말기 인증
- `lib/api/error.ts` - 에러 처리

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
