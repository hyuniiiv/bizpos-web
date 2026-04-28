# Session Log: 28-04-2026 11:32 - bizpos-payment-security-tdd

## Quick Reference (for AI scanning)
**Confidence keywords:** bizpos, payment, security, TDD, vitest, BizPlay, JWT, termId, merchant-key, Mock-fallback, offline-sync, electron, Vercel, analytics, transactions, keys, merchant-filter, store-filter, corner-rename, scan-wait-screen, double-payment, idempotency, config-polling
**Projects:** D:\BIZPOS_WEB\bizpos-web (BIZPOS — Next.js 16 + Electron POS)
**Outcome:** 보안 패치(C-1, H-1~H-5, C-2)를 TDD로 모두 처리(18 테스트), 가맹점/매장 필터 3개 페이지 적용, POS UI 정리, v0.1.74→v0.1.82 배포 완료

---

## Decisions Made

- **MockBizplayClient 폴백 정책**: 운영 환경에서는 throw, 개발(NODE_ENV=development)에서만 허용 — 무음 가짜 결제 방지가 최우선
- **권한 기준 통일**: `platform_admin`과 `terminal_admin` 둘 다 전체 가맹점/매장 조회 가능. 변수명 `isPlatformAdmin` → `hasFullAccess`
- **주문번호 충돌 방지 전략**: 밀리초(3자리) + 모듈 시퀀스 카운터(2자리) 조합. crypto.randomInt 대신 결정적 sequence 채택 — 테스트 가능성 우선
- **오프라인 배치 처리**: Option A(1건씩 순차) 채택. PG 응답 스키마 확인 전까지는 안전성 우선 (성능 저하 감수)
- **C-2 이중 결제 방지 전략**: approve 실패 시 `/api/payment/result`로 PG 실제 상태 조회 → 실제 성공이면 정상 처리, 어떤 결과든 pending 큐에서 제거(온라인 실패는 재시도 금지)
- **corner → name 마이그레이션**: 하위 호환 위해 `config.name || config.corner || 'BIZPOS'` 폴백 패턴 유지 (구 기기에서 재활성화 전까지 corner 표시)
- **MerchantStoreFilter / DateRangeFilter 재사용**: `basePath` prop 추가로 analytics/transactions/keys 3페이지에서 동일 컴포넌트 재사용
- **TodayStatBar 스타일**: RealTimeDashboard 요약 카드와 동일한 글래스 카드 형식(text-3xl/text-2xl + glass-card 2칸 grid)
- **Electron 아키텍처 유지**: Vercel API + Electron 번들 UI 구조는 POS에 적합 → 변경 없이 유지

---

## Key Learnings

- **Next.js Edge Runtime + requireTerminalAuth 호환성**: `jose` 기반이라 Edge에서 동작하지만, reserve route는 안전성을 위해 edge runtime 제거 후 dynamic import 사용
- **Supabase JS SDK GROUP BY 제약**: 분석 쿼리는 transactions 전체 fetch 후 JS Map으로 집계 (lib/analytics/queries.ts 패턴)
- **Supabase merchant_users 조인 타입**: `select('merchants(id, name)')` 시 결과가 객체 또는 배열로 추론 — `Array.isArray(raw) ? raw[0] : raw` 패턴 필요
- **Supabase 원자적 UPDATE**: `.is('access_token', null)` 조건부 update + `.select().single()`로 TOCTOU 방지
- **Zustand persist 직접 조작 금지**: `JSON.parse(localStorage)` 방식 대신 `useStore.getState().setX()` API 사용 — 스키마 변경 시 안정성
- **vitest mock + 모듈 import**: `vi.mock()` 호이스팅 + `await import()` 패턴이 ESM에서 안정적. `require()` 사용 시 "Cannot find module" 발생
- **Electron config polling 식별 필드 보호**: `terminal_configs.config` JSON 블롭에 `termId`/`name` 포함되면 폴링이 활성화 값을 덮어씀 → destructure로 제외
- **POS architecture 이중성**: UI는 Electron 정적 번들(file://) → 변경 시 .exe 재배포 필요. API/DB 변경은 Vercel/Supabase 즉시 반영
- **TDD RED 게이트의 가치**: 실패 → 수정 → 통과 사이클이 hooks gate(facts 강제)와 잘 맞물림. 빠른 피드백 루프

---

## Solutions & Fixes

### CRITICAL/HIGH 보안 패치 (TDD 6 사이클, 18 테스트)

**[C-1] MockBizplayClient 무음 폴백**
```ts
// lib/payment/getBizplayClient.ts
if (!terminal?.merchant_key_id) {
  if (isDev) return new MockBizplayClient()
  throw new Error(`Terminal '${termId}' has no merchant key configured.`)
}
```

**[H-1, H-2] body.termId → auth.payload.termId**
```ts
// payment/result, payment/offline routes
const termId = auth.payload.termId  // JWT only
// offline route: 타 단말기 레코드 403 검증
const invalid = records.filter(r => r.termId && r.termId !== termId)
if (invalid.length > 0) return 403
```

**[H-3] 주문번호 ms+seq**
```ts
// lib/payment/order.ts — 16자리 → 21자리
let _seq = 0
const ms = pad(now.getMilliseconds(), 3)
const seq = pad(_seq++ % 100, 2)
return { merchantOrderID: `${dt}${ms}${seq}${tid2}` }
```

**[H-4] 오프라인 배치 건별 처리**
```ts
// payment/offline route
for (const rec of records) {
  const result = await client.syncOffline([rec])  // 1건씩
  if (result.code === '0000') syncedIds.push(rec.merchantOrderID)
}
```

**[H-5] usedAmount 불일치 경고**
```ts
if (result.data.usedAmount !== undefined && result.data.usedAmount !== body.totalAmount) {
  console.warn('[approve] amount mismatch', body.totalAmount, result.data.usedAmount)
}
```

**[C-2] approve 실패 후 이중 결제 방지**
```ts
// lib/payment/paymentFlow.ts (신규)
export async function resolveApproveFailure(opts) {
  // /api/payment/result로 PG 실제 상태 조회
  // 어떤 결과든 markPaymentSynced 호출 (재시도 금지)
}
// pos/page.tsx
if (approveRes.code !== '0000') {
  const { isActuallySucceeded } = await resolveApproveFailure(...)
  if (isActuallySucceeded) { /* 성공 처리 */ }
}
```

### 기능 추가/버그

- **가맹점/매장 필터 (analytics/transactions/keys)**: `MerchantStoreFilter` + `DateRangeFilter` `basePath` prop 추가로 3페이지 재사용
- **단말기 유형별 매출 차트**: `TerminalTypeChart.tsx` 신규 — 식권체크기/POS/키오스크/테이블오더 색상 구분
- **POS corner → name 통일**: 6개 화면 + DeviceConfig + settingsStore. 하위 호환 `name || corner || 'BIZPOS'`
- **ScanWaitScreen "메뉴선택으로 돌아가기" 버튼**: `useMenuStore.getCurrentMode() === 'multi'`일 때만 표시
- **termId 초기화 후 '01' 표시 버그**: `ActivationScreen.tsx` updateConfig 스프레드 순서 수정 — `...cfg` 먼저, `termId: data.termId` 나중에
- **config 폴링이 termId/name 덮어쓰기 버그**: `pos/page.tsx`에서 `serverConfig`에서 `termId, name, corner, termName` destructure 제외
- **TodayStatBar**: `showPaymentList = false`일 때 ScanWaitScreen 상단에 RealTimeDashboard와 동일 스타일로 표시
- **`PosConfigForm` 헤더에 앱 버전 표시**: `terminal.current_app_version` 추가

---

## Files Modified

### 신규 파일
- `lib/payment/paymentFlow.ts` — `resolveApproveFailure` 유틸 (C-2)
- `lib/payment/__tests__/getBizplayClient.test.ts` — 4 tests (C-1)
- `lib/payment/__tests__/order.test.ts` — 4 tests (H-3)
- `lib/payment/__tests__/paymentFlow.test.ts` — 3 tests (C-2)
- `app/api/payment/__tests__/payment-routes.test.ts` — 3 tests (H-1, H-2)
- `app/api/payment/__tests__/approve-offline.test.ts` — 2 tests (H-5)
- `app/api/payment/__tests__/offline-batch.test.ts` — 2 tests (H-4)
- `components/analytics/MerchantStoreFilter.tsx` — 가맹점/매장 드롭다운 (basePath 지원)
- `components/analytics/TerminalTypeChart.tsx` — 단말기 유형별 막대 차트
- `components/pos/TodayStatBar.tsx` — 오늘 거래건/매출액 카드
- `bizpos-web/CLAUDE.md` — Karpathy 원칙 + BIZPOS 특화 규칙

### 결제 보안 (lib/payment, app/api/payment)
- `lib/payment/getBizplayClient.ts` — Mock 폴백 → throw (운영)
- `lib/payment/order.ts` — ms + seq 추가, 21자리 ID
- `app/api/payment/reserve/route.ts` — requireTerminalAuth 추가, edge 제거
- `app/api/payment/approve/route.ts` — auth.payload.termId 사용 + usedAmount 경고
- `app/api/payment/cancel/route.ts` — auth.payload.termId 사용
- `app/api/payment/result/route.ts` — auth.payload.termId 사용
- `app/api/payment/offline/route.ts` — JWT termId + 레코드 검증 + 건별 처리

### POS UI (corner → name + 기타)
- `types/menu.ts` — DeviceConfig.corner: string → name: string + corner?: optional
- `lib/store/settingsStore.ts` — 초기 corner → name
- `components/pos/ScanWaitScreen.tsx` — name 폴백 + multi 모드 버튼 + TodayStatBar
- `components/pos/MenuSelectScreen.tsx`, `OfflineScreen.tsx`, `RealTimeDashboard.tsx`, `SingleMenuScreen.tsx`, `screens/TableOrderScreen.tsx` — corner → name 폴백
- `components/pos/ActivationScreen.tsx` — updateConfig 스프레드 순서 수정 + name 저장
- `app/pos/page.tsx` — config 폴링 식별 필드 제외 + resolveApproveFailure 통합 + ScanWaitScreen refreshTrigger 전달

### 어드민 페이지 (가맹점/매장 필터)
- `app/store/admin/analytics/page.tsx` — merchant/store/role 처리
- `app/store/admin/transactions/page.tsx` — 동일 + DateRangeFilter 적용 + 요약 카드 UI 통일
- `app/store/admin/keys/page.tsx` — 가맹점 필터
- `components/analytics/AnalyticsClient.tsx` — 필터 props + TerminalTypeChart 통합
- `components/analytics/DateRangeFilter.tsx` — basePath prop 추가
- `components/dashboard/MerchantKeyClient.tsx` — merchantId prop 추가
- `app/store/admin/terminals/[id]/PosConfigForm.tsx` — 헤더에 앱 버전 표시
- `lib/analytics/queries.ts` — storeId 필터 + getTerminalTypeSummary + getStoreSummary

---

## Quick Resume Context

BIZPOS는 Next.js 16 App Router + Electron + Supabase + BizPlay PG 기반 POS 웹앱. 이번 세션은 (1) code-reviewer가 발견한 보안 이슈 11건을 TDD로 모두 처리하고, (2) analytics/transactions/keys 3페이지에 가맹점·매장 필터 추가, (3) POS UI 개선(corner→name 통일, 메뉴선택 버튼 조건, TodayStatBar 추가)을 v0.1.74 ~ v0.1.82로 배포함.

**남은 고민**:
- BizPlay PG의 offline 동기화 응답 스키마 확인 후 H-4를 Option B(per-record 결과 파싱)로 전환 검토
- C-2의 result API 호출이 실제 PG 상태를 정확히 반영하는지 통합 테스트 필요
- POS UI 변경마다 Electron 재배포 필요한 구조 유지(POS 안정성 우선) — 가벼운 텍스트 변경은 configSync로 동적 수신 고려 가능

다음 세션은 `! resume` 명령으로 컨텍스트 복원 가능.
