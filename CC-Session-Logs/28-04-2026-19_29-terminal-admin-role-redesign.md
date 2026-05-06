# Session Log: 28-04-2026 19:29 - terminal-admin-role-redesign

## Quick Reference (for AI scanning)
**Confidence keywords:** terminal_admin, JWT-expiry, SSE-401, RLS-bootstrap, app_metadata, MerchantSwitcher, remoteCommand, supabase-storage, electron-rsc, mu_self_select, bizpos.internal, multi-merchant, CRUD-restrictions
**Projects:** bizpos-web, bizpos-pos (Electron), Supabase
**Outcome:** terminal_admin 역할이 platform_admin과 동일한 전체 조회 + 단말기·키 CRUD만 가능. JWT 무기한 + 자동 갱신, 원격 명령 활성화, RLS 정책으로 코드 변경 최소화.

## Decisions Made
- **JWT 만료 무기한** — 단말기 토큰은 7일 → 무제한. POS 운영상 7일마다 재활성화 비현실적. 토큰이 단말기 로컬에만 저장되어 보안 위험 낮음.
- **terminal_admin 권한 모델** — `app_metadata.role` 기반 식별. `merchant_users` 매핑 불필요. RLS 함수 `is_terminal_admin()`로 모든 테이블 일괄 조회 허용 (코드 수정 최소화).
- **SSE 토큰 출처** — `localStorage.getItem('bizpos-settings')` 직접 파싱 → `useSettingsStore.getState().deviceToken` 사용. 스토어가 IndexedDB 저장이라 localStorage엔 없었음.
- **`@` 없는 사용자명 지원** — `bizpos@bizpos.internal`로 자동 변환. Supabase는 이메일 형식 강제. 로그인/멤버추가 양쪽 처리.
- **포털 부트스트랩 RLS** — `mu_self_select` 정책 추가 (`user_id = auth.uid()`). `get_my_merchant_id()` 순환 참조 회피.
- **admin 클라이언트 사용 정책** — 서버 컴포넌트/API에서 RLS 우회 OK. 이미 `auth.getUser()` + 권한 체크 후 호출되므로 안전.
- **메뉴 수정 위치** — pos/admin은 읽기 전용. 모든 메뉴 편집은 웹 admin에서만. 다중 단말기 일관성 보장.
- **외부 디스플레이** — 설정 UI만 있고 Electron 구현 미완. memory에 기록만.

## Solutions & Fixes
- **JWT 만료 제거** (`lib/terminal/jwt.ts`): `setExpirationTime('7d')` 라인 삭제
- **만료 토큰 refresh 허용** (`/api/device/token/refresh`): `jwtVerify` `clockTolerance: 999_999_999` + `requireTerminalAuth` → 직접 verify
- **SSE 토큰 읽기 수정** (`pos/admin/page.tsx`): localStorage → `useSettingsStore.getState().deviceToken`
- **SSE 401 자동 갱신** (`pos/admin/page.tsx` + `lib/onlineSync.ts`): 401 받으면 refresh 호출
- **transactions API Supabase 전환** (`/api/transactions`): 파일시스템 읽기 → Supabase 쿼리 (Vercel 읽기전용 FS 회피)
- **Electron RSC 파일 라우팅** (`electron/main.js`): Rule 3 추가 — `C:/path/file.ext` → `resources/nextjs/path/file.ext`
- **Realtime command listener 위치** (`pos/layout.tsx`): pos/page.tsx → layout으로 이동, `/pos/*` 어디서나 동작
- **RemoteCommandPanel 신규** (`components/dashboard/`): 사이드바용 인라인 버튼 패널
- **terminal_commands RLS** (Supabase SQL): anon SELECT/UPDATE 정책 추가
- **isActive 토글 변경** (`PosConfigForm.tsx`): 체크박스 → 토글 버튼
- **사운드 파일 입력 추가** (`PosConfigForm.tsx`): ticket_checker 메뉴 폼에 soundFile 필드
- **메뉴별 서비스 구분코드** (`MenuSettingForm.tsx`): MenuConfig.serviceCodes[] 편집 UI
- **사용자명 @ 자동 부여** (`merchant/members/route.ts` + `login/page.tsx`)
- **handle_new_user 트리거 비활성** (Supabase SQL): no-op으로 교체
- **mu_self_select RLS** (`20260421000004_rls_user_tables.sql`): `user_id = auth.uid()` 자기 행 직접 허용
- **merchant_users INSERT admin 클라이언트** (`merchant/members/route.ts`): RLS 우회
- **getAllUsers admin 클라이언트** (`merchants/[id]/page.tsx`): listUsers는 service_role 필요
- **app_metadata.role 자동 설정**: 멤버 생성 시 `terminal_admin` / `merchant` 자동 부여
- **terminal_admin RLS 정책** (`20260428000002_terminal_admin_rls.sql`): `is_terminal_admin()` 함수 + 6개 테이블 SELECT
- **terminal_admin merchant_list** (`/api/merchant/list`): 전체 가맹점 반환
- **store 단말기 수 표시** (`stores/page.tsx`): terminals fetch 추가
- **CRUD 제한**: terminal_admin은 매장/가맹점 add/edit/delete=false
- **메뉴 권한 dropdown 확장** (`MerchantDetailClient.tsx`): terminal_admin, store_admin 옵션
- **멤버 목록 역할 라벨**: 모든 역할 표시
- **기존 계정 비밀번호 불필요** (`merchant/members/route.ts`): 이미 존재하면 password 없이 진행
- **대기화면 활성 메뉴 표시** (`ScanWaitScreen.tsx`): ticket_checker 모드

## Files Modified

### POS / Electron
- `electron/main.js`: 프로토콜 인터셉터 Rule 3
- `app/pos/layout.tsx`: RemoteCommandListener 마운트
- `app/pos/page.tsx`: 중복 리스너 제거
- `app/pos/admin/page.tsx`: 메뉴 탭 읽기 전용, SSE 토큰·401 갱신, 사운드 컬럼, 서비스코드 표시
- `components/pos/RemoteCommandListener.tsx` (신규)
- `components/pos/ScanWaitScreen.tsx`: 활성 메뉴 카드
- `components/dashboard/TerminalCommandPanel.tsx` (신규)
- `components/admin/MenuSettingForm.tsx`: 메뉴별 서비스 구분코드
- `app/store/admin/terminals/[id]/PosConfigForm.tsx`: 사운드, isActive 토글

### Auth / Permissions
- `lib/terminal/jwt.ts`: 만료 제거
- `lib/hooks/useAuth.ts`: terminal_admin 인식
- `lib/onlineSync.ts`: heartbeat 401 → refresh
- `components/auth/ProtectedRoute.tsx`: terminal_admin merchant 통과
- `app/login/page.tsx`: type=text, @bizpos.internal
- `app/portal/page.tsx`: terminal_admin 직통, admin client

### Store Admin Pages
- `app/store/admin/layout.tsx`: terminal_admin 처리
- `app/store/admin/NavItem.tsx`: 가맹점 메뉴 표시
- `app/store/admin/merchants/page.tsx`: admin client
- `app/store/admin/merchants/MerchantsClient.tsx`: terminal_admin canAccess=true, CRUD=false
- `app/store/admin/merchants/[id]/page.tsx`: getAllUsers/getMembers admin client
- `app/store/admin/merchants/[id]/MerchantDetailClient.tsx`: 역할 옵션·라벨 확장
- `app/store/admin/stores/page.tsx`: admin client + terminals 조회
- `app/store/admin/stores/[id]/page.tsx`: admin client, isTerminalAdmin
- `app/store/admin/stores/StoresClient.tsx`: CRUD=false
- `app/store/admin/terminals/TerminalsClient.tsx`: TerminalCommandMenu 추가
- `app/store/admin/terminals/[id]/page.tsx`: TerminalCommandPanel 사이드바
- `app/store/admin/menus/page.tsx`: 글로벌 서비스코드 섹션 제거

### API
- `app/api/transactions/route.ts`: GET → Supabase
- `app/api/device/token/refresh/route.ts`: 만료 토큰 허용
- `app/api/merchant/list/route.ts`: terminal_admin 전체 반환
- `app/api/merchant/members/route.ts`: admin INSERT, app_metadata.role, 비번 선택

### Supabase 마이그레이션
- `supabase/migrations/20260428000001_terminal_commands.sql` (신규)
- `supabase/migrations/20260428000002_terminal_admin_rls.sql` (신규)
- `20260421000004_rls_user_tables.sql`: `mu_self_select` 추가

### 메모리
- `~/.claude/projects/D--BIZPOS-WEB/memory/project_external_display.md` (신규)

## Pending Tasks

### 즉시 필요
- **프로덕션 Supabase**에 적용:
  - `mu_self_select` RLS
  - `is_terminal_admin()` + 6개 RLS 정책
  - `handle_new_user()` no-op
- **프로덕션 bizpos 계정** `app_metadata.role = 'terminal_admin'`:
  ```sql
  update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role": "terminal_admin"}'::jsonb
  where email = 'bizpos@bizpos.internal';
  ```

### 미구현 / 후속
- **외부 디스플레이 (세컨드 모니터)** — Electron 동작 없음
- **`get_my_merchant_id()` 순환 RLS** 근본 정리
- **메뉴 식사시간대 저장소 통합** — web localStorage vs 단말기 zustand
- **alerts 페이지 권한** — terminal_admin 읽기 전용 적용
- **keys CRUD 권한** — terminal_admin 허용 확인

### 배포 상태
- v0.2.2 마지막 태그 (Electron). 이후 commit은 태그 없이 Vercel만 배포.
- 다음 태그 v0.2.3로 진행

---

## Quick Resume Context

BIZPOS-WEB 권한 시스템과 POS 단말기 연동 대대적 개편 세션. 핵심: (1) `terminal_admin` 역할이 `merchant_users` 매핑 없이 `app_metadata.role` JWT 클레임만으로 platform_admin 수준 전체 조회 + 단말기/키 CRUD만 허용, (2) JWT 만료 제거 + 자동 갱신, (3) Supabase Realtime 기반 원격 명령 활성화, (4) 사용자명 `@` 없으면 `@bizpos.internal` 자동 부여. 프로덕션 Supabase 마이그레이션과 bizpos 계정 `app_metadata` 업데이트가 남은 작업.
