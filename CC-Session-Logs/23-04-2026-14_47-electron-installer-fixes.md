# Session Log: 23-04-2026 14:47 — electron-installer-fixes

## Quick Reference (for AI scanning)
**Confidence keywords:** electron-builder, Next.js standalone, pnpm, node-linker hoisted, extraResources, files pattern order, electron-updater, device activation, Vercel routing, SUPABASE_SERVICE_ROLE_KEY, TERMINAL_JWT_SECRET, server.js, require next, Cannot find module, BIZPOS, v0.1.11, v0.1.12, v0.1.13, v0.1.14, v0.1.15, v0.1.16, v0.1.17, v0.1.18, v0.1.19, feature/badge-meal-settlement
**Projects:** BIZPOS_WEB / bizpos-web (Electron POS 단말기 앱)
**Outcome:** Electron 설치본이 실행되지 않던 3가지 연속 문제(`server.js`/`next`/`electron-updater` 누락) 해결 + activation 엔드포인트 500 에러를 Vercel 라우팅으로 해결 + installer 크기 최적화까지 완료.

---

## Solutions & Fixes

### 1. `server.js 없음` (v0.1.11)
Next.js standalone 출력이 `.next/standalone/bizpos-web/server.js` 또는 `.next/standalone/server.js` 두 구조 중 하나로 나옴. `electron-builder.yml extraResources`에 A/B 구조 모두 대응하도록 두 개의 `from` 경로 선언.

### 2. `Cannot find module 'next'` (v0.1.12~v0.1.14)
- **v0.1.12**: CI workflow에 `NPM_CONFIG_NODE_LINKER: hoisted` env var 주입 — pnpm에서 확실히 먹는다는 보장 없어 실패.
- **v0.1.13**: 진단 스텝 + PowerShell fallback 복사 추가 — `if (-not (Test-Path $dest))` 가드가 이미 깨진 symlink 폴더를 skip시켜 실패.
- **v0.1.14 (성공)**: `.npmrc`에 `node-linker=hoisted` 직접 설정 + `electron-builder.yml extraResources`에 `node_modules` → `nextjs/node_modules` 직접 복사 규칙 추가. 결과 로그 `server.js 존재: True`, `node_modules/next/package.json 존재: True`. 단말기에서 `▲ Next.js 16.1.6 ... ✓ Ready in 761ms`.

### 3. `Cannot find module 'electron-updater'` (v0.1.15, v0.1.18)
- **v0.1.15 (실패)**: `files`에 `node_modules/electron-updater/**` 등 포함 규칙을 추가했으나 바로 뒤의 `!node_modules/**` 제외 규칙에 덮여 실제로는 여전히 누락.
- **v0.1.18 (수정)**: electron-builder `files` 패턴 순서 규칙(뒤 패턴 > 앞 패턴) 적용. 제외 먼저, 포함 뒤로 재배치.

### 4. Activation 500 에러 (v0.1.16~v0.1.17)
- 원인: `/api/device/activate`가 `createAdminClient()`로 `SUPABASE_SERVICE_ROLE_KEY` 사용 → 런타임 로컬 서버에는 이 env 없음.
- **v0.1.16**: ActivationScreen + onlineSync + configSync + pos/page + pos/admin/page + DeviceStatus 6개 파일의 fetch를 `getServerUrl() + path`로 전환.
- **v0.1.17**: executor agent가 `DeviceStatus.tsx`와 `onlineSync.ts`의 `import`를 빠뜨려 Vercel 빌드 TypeScript 에러 → 수동으로 import 추가.

### 5. Rate limit (`RATE_LIMITED`, 894s)
- `lib/api/rateLimit.ts`의 in-memory `Map` 기반. 키가 `127.0.0.1:device-activate`로 고정 → 로컬 전용.
- **즉시 해결**: Electron 앱 완전 종료(작업관리자에서 BIZPOS 프로세스 kill) 후 재시작 → 서버 프로세스 새로 spawn되면서 Map 초기화.

### 6. PIN `1234` 인식 실패
- 원인: 이전 버전에서 persist된 `bizpos-settings`(zustand)가 `%APPDATA%\bizpos-web\Local Storage\`에 남아 기본값을 덮고 있었음. NSIS 언인스톨러는 userData 보존이 기본.
- 해결: `Remove-Item -Recurse -Force "$env:APPDATA\bizpos-web"` 또는 F12 → Local Storage에서 `bizpos-settings` 삭제.

### 7. Installer 크기 최적화 (v0.1.19)
- `.next/standalone/bizpos-web` 복사 시 원본 소스 제외: `app/`, `components/`, `lib/`, `types/`, `data/`, `supabase/`, `docs/`, `scripts/`, `electron/`, `public/`, `*.md`, `*.ts`, `*.mjs`, `tsconfig*.json`, lockfile 등.
- `node_modules` 복사 시 런타임 불필요 파일 제외: source map(`*.map`), `LICENSE*`, `CHANGELOG*`, `docs/`, `example/`, `test/`, `.github/`, `.vscode/` 등.

---

## Files Modified

- **`.npmrc`** (신규): `node-linker=hoisted` — pnpm 플랫 설치 강제.
- **`electron-builder.yml`**:
  - `files`: 제외 먼저 → 포함 뒤로 순서 재배치. electron-updater + 직접 의존 패키지(builder-util-runtime, fs-extra, graceful-fs, jsonfile, universalify, semver, lazy-val) 명시적 포함.
  - `extraResources`: A/B 구조 standalone 대응 + `node_modules` → `nextjs/node_modules` 직접 복사. 소스 폴더·런타임 불필요 파일 filter 제외.
- **`.github/workflows/release.yml`**:
  - `Install dependencies`: `.npmrc`로 hoisted 제어, env var 제거.
  - `Verify install is hoisted` diagnostic step.
  - `Diagnose packaged output` step (server.js + node_modules/next 존재 확인).
- **`components/pos/ActivationScreen.tsx`**: `getServerUrl()` prefix로 Vercel 라우팅.
- **`lib/onlineSync.ts`**: `getServerUrl` import + activate/heartbeat×2/token-refresh fetch URL 전환.
- **`lib/configSync.ts`**: `getServerUrl` import + config fetch URL 전환.
- **`app/pos/page.tsx`**: heartbeat fetch URL 전환.
- **`app/pos/admin/page.tsx`**: report-version, device/config fetch URL 전환.
- **`components/admin/DeviceStatus.tsx`**: `getServerUrl` import + health fetch URL 전환.
- **`package.json`**: version bump 0.1.11 → 0.1.19.

---

## Setup & Config (최종 상태)

### `.npmrc`
```
node-linker=hoisted
```

### `electron-builder.yml` 주요 블록
```yaml
files:
  - electron/**
  - package.json
  - "!node_modules/**"
  - "!src/**"
  - "!app/**"
  - "!components/**"
  - "!lib/**"
  - "!public/**"
  - "!.next/**"
  - node_modules/electron-updater/**
  - node_modules/builder-util-runtime/**
  - node_modules/fs-extra/**
  - node_modules/graceful-fs/**
  - node_modules/jsonfile/**
  - node_modules/universalify/**
  - node_modules/semver/**
  - node_modules/lazy-val/**

extraResources:
  - from: .next/standalone/bizpos-web
    to: nextjs
    filter:
      - "**/*"
      - "!app/**"
      - "!components/**"
      - "!lib/**"
      - "!types/**"
      - "!data/**"
      - "!docs/**"
      - "!supabase/**"
      - "!scripts/**"
      - "!electron/**"
      - "!public/**"
      - "!*.md"
      - "!*.mjs"
      - "!*.ts"
      - "!tsconfig*.json"
      - "!package-lock.json"
      - "!pnpm-lock.yaml"
  - from: .next/standalone
    to: nextjs
    filter: ["**/*", "!bizpos-web/**"]
  - from: .next/static
    to: nextjs/.next/static
    filter: ["**/*"]
  - from: public
    to: nextjs/public
    filter: ["**/*"]
  - from: node_modules
    to: nextjs/node_modules
    filter:
      - "**/*"
      - "!electron/**"
      - "!electron-builder/**"
      - "!**/*.map"
      - "!**/LICENSE*"
      - "!**/CHANGELOG*"
      - "!**/test/**"
      - "!**/examples/**"
```

### `release.yml` 스텝 순서
1. Checkout
2. Setup Node 24
3. Setup pnpm 9
4. Install dependencies (`.npmrc`로 hoisted)
5. Verify install is hoisted (diagnostic)
6. Build Next.js + Electron (Windows) — secrets 주입
7. Diagnose packaged output — `server.js`, `node_modules/next/package.json` 존재 확인
8. Upload artifacts

---

## Errors & Workarounds

| 에러 | 근본 원인 | 해결 |
|------|-----------|------|
| `server.js 없음` 탐색 경로 모두 실패 | standalone이 `bizpos-web/` 하위로 생성되지 않음 | A/B 두 구조 모두 복사 대상으로 선언 |
| `Cannot find module 'next'` | pnpm isolated의 `node_modules/next`가 외부 `.pnpm` 심볼릭 링크 | `.npmrc node-linker=hoisted` + 루트 `node_modules` 직접 복사 |
| `Cannot find module 'electron-updater'` | electron-builder `files`의 `!node_modules/**`가 앞의 포함 규칙을 덮음 | 순서 재배치: 제외 먼저 → 포함 뒤로 |
| Activation 500 | 로컬 server가 `SUPABASE_SERVICE_ROLE_KEY` 접근 불가 | device/terminal fetch를 `getServerUrl()`로 Vercel 라우팅 |
| TypeScript "Cannot find name 'getServerUrl'" (v0.1.16) | executor agent가 import 추가 누락 | 수동 import 추가 + grep으로 검증 |
| `RATE_LIMITED 894초` | 로컬 fixed-key rate limit Map이 프로세스 살아있는 동안 누적 | 작업관리자에서 BIZPOS 프로세스 완전 종료 후 재시작 |
| PIN `1234` 불일치 | 이전 버전의 zustand persist 잔류 | `%APPDATA%\bizpos-web\` 삭제 또는 localStorage 초기화 |

---

## 릴리즈 히스토리

| 버전 | 핵심 변경 | 결과 |
|------|-----------|------|
| 0.1.11 | `server.js` 경로 A/B 구조 대응 | `server.js` 찾음, 그러나 `require('next')` 실패 |
| 0.1.12 | CI env `NPM_CONFIG_NODE_LINKER=hoisted` | 여전히 `Cannot find module 'next'` |
| 0.1.13 | 진단 + PowerShell fallback 복사 | skip 가드 때문에 여전히 실패 |
| **0.1.14** | **`.npmrc` hoisted + 루트 `node_modules` 직접 복사** | **✅ Next.js 서버 기동 성공** |
| 0.1.15 | `files`에 `electron-updater` 포함 추가 | 순서 오류로 여전히 누락 |
| 0.1.16 | device API를 Vercel로 라우팅 (6 파일) | Vercel 빌드 실패 (`getServerUrl` import 누락) |
| 0.1.17 | `getServerUrl` import 보강 | ✅ 활성화 성공, electron-updater 여전히 경고 |
| **0.1.18** | **`files` 순서 재배치 (제외→포함)** | **electron-updater 복구 (배포 진행 중)** |
| **0.1.19** | **installer 크기 축소 (소스·메타 파일 제외)** | **수십 MB+ 감소 예상** |

---

## Quick Resume Context

BIZPOS Electron POS 앱의 v0.1.11~v0.1.19 릴리즈에서 연속 3건의 설치본 실행 실패(`server.js`→`next`→`electron-updater`)와 activation 500 에러, installer 크기 문제를 해결한 세션. 핵심 고착점은 **pnpm + Next.js standalone + electron-builder의 symlink/패턴 순서 충돌**. `.npmrc`로 pnpm을 hoisted 모드로 고정하고 `extraResources`에 `node_modules`를 직접 복사하는 방식으로 근본 해결. 단말기측 device/terminal API는 운영 Vercel 서버로 라우팅 일원화. v0.1.19에서 소스 폴더와 런타임 불필요 파일을 filter 제외해 용량 축소. 다음 세션에서는 (1) v0.1.18/v0.1.19 설치본 실동작 검증, (2) rate limit 완화(limit 상향 또는 성공 시 reset), (3) installer 2차 최적화 여부 판단. 브랜치 `feature/badge-meal-settlement`, 최신 태그 `v0.1.19`.

---

## Custom Notes

**릴리즈 히스토리** (사용자 요청 강조): 위의 `릴리즈 히스토리` 표 참고. v0.1.14가 서버 기동의 분기점, v0.1.17이 activation 성공의 분기점, v0.1.18/v0.1.19는 검증 대기 중.

---

## Raw Session Log

본 세션은 이전 대화의 압축 요약 상태로 시작되었으며, Claude Code session 아카이브에 전체 원문이 자동 보관됨. 압축 전 흐름 요약:

1. 사용자가 0.1.10 설치본에서 `server.js 없음` 에러 보고 → A/B 구조 대응하는 electron-builder.yml 수정 → 0.1.11 푸시
2. `Cannot find module 'next'` 에러 → pnpm symlink 원인 진단 → hoisted 모드 시도 (0.1.12~0.1.13) → `.npmrc` 방식으로 전환 (0.1.14) 성공
3. `Cannot find module 'electron-updater'` 경고 → `files`에 명시 포함 시도 (0.1.15) → 순서 오류 확인 (0.1.18)
4. Activation 500 에러 → 로컬 서버에 secrets 없음 진단 → Vercel 라우팅 일괄 전환 (0.1.16) → import 누락 수정 (0.1.17) → 활성화 성공
5. Rate limit 이슈 설명 + PIN 인식 실패 원인(persisted localStorage) 설명
6. Installer 크기 최적화 요청 → filter 대폭 강화 (0.1.19)
