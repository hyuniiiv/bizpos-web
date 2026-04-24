# Session Log: 24-04-2026 17:30 - phase-2-4-store-hierarchy

## Quick Reference (for AI scanning)
**Confidence keywords:** BIZPOS, store-hierarchy, Phase-2, Phase-3, Phase-4, API, StoreSwitcher, StoreContext, TDD, Vitest, merchant-store-terminal, RLS, store_id, terminals, merchant_users, store_managers
**Projects:** bizpos-web (Next.js 16 + React 19 + Supabase)
**Outcome:** Phase 2 (API 계층) + Phase 3 (StoreContext) 완료. Phase 4 TDD 인프라 구축 및 RED phase 시작.

## Decisions Made
- **테스트 프레임워크: Vitest 선택** — React 19 + Next.js 16 환경에서 Jest 대비 설정 단순
- **StoreContext에 localStorage 사용** — 선택된 매장 ID 영속화, 서버쿠키(`bp_selected_store`)와 병행
- **GET /api/merchant/members 확장 방식** — 새 엔드포인트 생성 대신 query parameter `store_id` 추가로 store_managers 조회
- **TDD 방식 선택** — Phase 4는 테스트 인프라 구축 후 RED→GREEN→REFACTOR 사이클

## Solutions & Fixes
- **Fact-Forcing Gate 통과 패턴** — 각 파일 편집 전에 4가지 정보(호출파일, 기존파일, 데이터필드, 사용자지시) 제시
- **POST /api/terminals store_id 검증 로직**:
  ```ts
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('merchant_id', merchantUser.merchant_id)
    .single()
  ```
- **cookieStore 중복 await 제거** — 함수 초입에 한 번만 await

## Files Modified

### Phase 2: API 계층
- `app/api/terminals/route.ts` — POST 핸들러에 store_id 필수 필드 + store 권한 검증 추가
- `app/api/merchant/members/route.ts` — GET 핸들러에 `?store_id=xxx` query param으로 store_managers 조회 분기 추가
- `app/api/device/activate/route.ts` — 응답에 `storeId` 필드 추가

### Phase 3: StoreContext
- `lib/context/StoreContext.tsx` (신규) — StoreProvider + useStore() hook
- `app/store/admin/StoreSwitcher.tsx` (신규) — 매장 선택 드롭다운 UI
- `app/store/admin/layout.tsx` — stores fetch + StoreProvider 통합, StoreSwitcher 렌더링

### Phase 4: TDD 인프라
- `vitest.config.ts` (신규) — jsdom + @ alias + v8 coverage
- `vitest.setup.ts` (신규) — @testing-library/jest-dom + localStorage mock
- `package.json` — test, test:ui, test:coverage 스크립트 추가
- `app/store/admin/stores/StoresClient.test.tsx` (신규) — RED phase 첫 테스트

## Setup & Config
- **Vitest 설치**: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/ui`
- **프로젝트 경로**: `D:\BIZPOS_WEB\bizpos-web`
- **테스트 환경**: jsdom
- **Path alias**: `@` → 프로젝트 루트

## Pending Tasks

### Phase 4 (진행중)
- [ ] **GREEN phase**: `StoresClient.tsx` 구현 — 매장별 단말기 inline 표시
- [ ] **RED phase 추가**: `terminals/page.test.tsx` (매장별 필터링)
- [ ] **RED phase 추가**: `members/MembersClient.test.tsx` (store별 멤버)
- [ ] **GREEN phase**: 각 컴포넌트 구현
- [ ] **REFACTOR phase**: 공통 로직 추출

### Phase 5 (대기)
- [ ] Members 페이지 N+1 쿼리 최적화
- [ ] 권한 기반 필터 UI 구현

### Phase 1b (관찰기간 후)
- [ ] terminals.store_id NOT NULL 제약 추가 (1주일 관찰 후)
- [ ] UNIQUE(store_id, term_id) 제약 전환

## Errors & Workarounds
- **Bash `cd /d` 문제** — Windows cmd 문법이 bash에서 실패. bash에서는 상대 경로만 사용
- **Fact-Forcing Gate 반복 발동** — 매 파일 편집마다 4가지 정보 제시 필요

## Key Exchanges
- 사용자 "yes" — Phase 3 진행 승인
- 사용자 "/tdd 시작" — TDD 방식 Phase 4 시작 요청
- 사용자 "a" — 테스트 인프라 설치 선택 (영구적 변경)
- 사용자 "4" — 세션 저장 요청

## Custom Notes
Phase 2-3는 실제 Supabase 연동 완료, Phase 4는 테스트 작성 중. 다음 세션에서 GREEN phase (StoresClient 구현)부터 재개.

---

## Quick Resume Context
BIZPOS 3계층 계층구조(가맹점→매장→단말기) 리팩토링 작업. Phase 1a-3 완료, Phase 4 TDD 인프라 구축 및 첫 테스트 작성까지 완료. 다음 세션에서는 `app/store/admin/stores/StoresClient.tsx`를 테스트 통과하도록 구현 (GREEN phase)하고 나머지 컴포넌트(terminals/page, members) 테스트 작성 및 구현 진행. Vitest는 이미 설정 완료.

---

## Raw Session Log
(이전 세션에서 압축됨 - Phase 2 (API 계층), Phase 3 (StoreContext + StoreSwitcher + layout 통합), Phase 4 (Vitest 설치 + RED phase 첫 테스트) 순서로 진행)
