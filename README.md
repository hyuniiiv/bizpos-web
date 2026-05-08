# BIZPOS Web

BIZPOS Web은 BIZPLAY 결제/식권 연동 POS 운영 시스템입니다. Next.js 기반 웹앱으로
POS 단말 화면, 결제 API, 매장 관리자, 고객사 관리자, 단말 설정 동기화, 정산/통계 기능을
제공하며 Electron으로 Windows 데스크톱 POS 앱 패키징도 지원합니다.

## 주요 기능

- POS 단말 화면: 바코드, QR, RF카드 입력 기반 결제/식권 처리
- 결제 연동: BIZPLAY 예약, 승인, 취소, 결과 조회 API 연동
- 오프라인 처리: IndexedDB pending queue 저장 후 온라인 복구 시 동기화
- 단말 관리: 단말 인증, JWT 발급, heartbeat, 원격 설정 동기화
- 매장 관리자: 단말, 메뉴, 거래내역, 직원, 권한, 정산, 알림 관리
- 고객사 관리자: 고객사, 직원, 사용 이력, 구성원 권한, 정산 관리
- 분석/모니터링: 거래 통계, 단말 상태, 이상 거래 알림
- 데스크톱 배포: Electron 기반 POS 앱 빌드

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth/Database
- Zustand
- IndexedDB
- Tailwind CSS, shadcn/ui, lucide-react
- Vitest, Playwright
- Electron, electron-builder

## 디렉터리 구조

| 경로 | 설명 |
| --- | --- |
| `app/` | Next.js App Router 페이지와 API 라우트 |
| `app/pos/` | POS 단말 화면 |
| `app/store/admin/` | 매장/가맹점 관리자 화면 |
| `app/client/admin/` | 고객사 관리자 화면 |
| `app/api/` | 결제, 단말, 관리자, 정산 API |
| `components/` | 재사용 React 컴포넌트 |
| `lib/payment/` | 결제 연동 및 주문/바코드 처리 |
| `lib/terminal/` | 단말 JWT 인증 |
| `lib/supabase/` | Supabase 클라이언트 |
| `lib/store/` | Zustand 클라이언트 상태 |
| `lib/db/` | IndexedDB 로컬 저장 |
| `lib/roles/` | 역할/권한 로직 |
| `supabase/` | DB 스키마, seed, migration |
| `electron/` | Electron 메인 프로세스 및 데스크톱 연동 |
| `e2e/` | Playwright E2E 테스트 |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

프로젝트에는 `package-lock.json`과 `pnpm-lock.yaml`이 모두 존재하지만, 현재 스크립트 기준
README에서는 `npm` 사용을 기본으로 설명합니다.

### 2. 환경 변수 설정

`.env.example`을 참고해 `.env.local`을 생성합니다.

필수 항목:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

BIZPLAY 실연동이 필요한 경우 다음 계열의 값도 설정합니다.

```bash
BIZPLAY_MID=
BIZPLAY_ENC_KEY=
BIZPLAY_ONLINE_AK=
```

값이 없으면 일부 결제 흐름은 mock client 또는 제한된 동작으로 실행될 수 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

주요 진입점:

- `http://localhost:3000/login`
- `http://localhost:3000/portal`
- `http://localhost:3000/pos`
- `http://localhost:3000/store/admin`
- `http://localhost:3000/client/admin`

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | Next.js 개발 서버 실행 |
| `npm run build` | Next.js 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행 |
| `npm test` | Vitest 실행 |
| `npm run test:coverage` | 테스트 커버리지 실행 |
| `npm run test:e2e` | Playwright E2E 테스트 실행 |
| `npm run electron:dev` | Next 개발 서버와 Electron 동시 실행 |
| `npm run electron:build` | Electron 배포 빌드 |
| `npm run electron:build:win` | Windows Electron 빌드 |

## 인증과 권한

관리자 로그인은 Supabase Auth를 사용합니다. 로그인 후 `/portal`에서 사용자 소속과 역할에 따라
매장 관리자 또는 고객사 관리자 화면으로 이동합니다.

주요 역할:

- `platform_admin`
- `platform_manager`
- `terminal_admin`
- `merchant_admin`
- `merchant_manager`
- `store_admin`
- `store_manager`
- `client_admin`
- `client_manager`

단말기는 관리자 세션이 아니라 `/api/device/auth`에서 발급받은 단말 JWT를 사용해 결제, 설정,
heartbeat API에 접근합니다.

## 결제 흐름

POS 화면은 바코드/QR/RF카드 입력을 받은 뒤 다음 흐름으로 처리합니다.

1. 입력 타입과 바코드 정보를 판별합니다.
2. 메뉴, 금액, 서비스 코드를 결정합니다.
3. 중복 바코드를 IndexedDB 기준으로 확인합니다.
4. 오프라인이면 pending payment로 저장합니다.
5. 온라인이면 `/api/payment/reserve`로 결제 예약을 요청합니다.
6. `/api/payment/approve`로 결제를 승인합니다.
7. 거래내역을 로컬 상태와 Supabase에 반영합니다.
8. 승인 실패 시 `/api/payment/result`로 실제 PG 상태를 재확인합니다.

## Supabase

DB 스키마와 migration은 `supabase/` 아래에 있습니다.

- `supabase/schema.sql`: 기본 스키마
- `supabase/seed.sql`: seed 데이터
- `supabase/migrations/`: 변경 migration
- `types/supabase.ts`: Supabase 타입 정의

로컬 또는 원격 Supabase 프로젝트 연결 시 `.env.local`의 Supabase URL, anon key,
service role key가 필요합니다.

## 테스트

```bash
npm test
npm run test:coverage
npm run test:e2e
```

단위 테스트는 결제, 권한, 식권 시간대 판별, 컨텍스트 등 핵심 로직을 중심으로 구성되어 있습니다.
E2E 테스트는 관리자 계층/권한 흐름을 검증합니다.

## Electron 빌드

개발 중 Electron 실행:

```bash
npm run electron:dev
```

Windows 빌드:

```bash
npm run electron:build:win
```

Electron 빌드 시 `BUILD_TARGET=electron` 환경에 따라 Next.js static export 설정이 적용됩니다.

## 참고

- 루트 `/`는 `/login`으로 redirect됩니다.
- `middleware.ts`는 현재 루트에 존재하지 않으며, 인증 보호는 각 layout/API 라우트와 Supabase 세션/JWT 검증 로직에서 처리됩니다.
- 일부 오래된 문서에는 Next.js 15로 표기되어 있으나 현재 `package.json` 기준 버전은 Next.js 16입니다.
