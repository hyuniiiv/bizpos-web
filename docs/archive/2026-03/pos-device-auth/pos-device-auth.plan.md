# [Plan] pos-device-auth

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem Solved** | POS 화면이 device API(activate/heartbeat)를 전혀 호출하지 않아 단말기 인증·상태관리 불가 |
| **Solution Approach** | 활성화 코드 입력 화면 추가, JWT 저장/전송, 30초 heartbeat로 online 상태 유지 |
| **Function/UX Effect** | 최초 진입 시 활성화 코드 입력 → 이후 자동 인증, 관리자 콘솔에서 실시간 단말기 상태 확인 |
| **Core Value** | POS-서버 인증 체계 완성 — 미인가 단말기 차단, 단말기별 설정 동기화 가능 |

---

## 1. 배경 및 목표

### 현재 상태
- `/api/device/activate`, `/api/device/auth`, `/api/device/heartbeat`, `/api/device/config` 모두 구현됨
- POS 화면(`app/pos/page.tsx`)이 이 API들을 전혀 호출하지 않음
- 단말기 상태가 항상 offline/inactive로 표시됨
- termId를 `/pos/admin`에서 수동 입력해야 함

### 목표
- POS 최초 진입 시 활성화 코드로 JWT 발급
- JWT를 localStorage에 저장하여 이후 자동 인증
- 30초마다 heartbeat → 단말기 상태 online 유지
- activate 응답의 termId/config 자동 반영

---

## 2. 구현 범위

### 2.1 신규 컴포넌트
- `components/pos/ActivationScreen.tsx` — 활성화 코드 입력 UI

### 2.2 수정 파일
| 파일 | 변경 내용 |
|------|---------|
| `lib/store/settingsStore.ts` | `deviceToken`, `deviceTerminalId` 상태 + `setDeviceToken`, `clearDeviceToken` 액션 추가 |
| `app/pos/page.tsx` | 인증 가드 (deviceToken 없으면 ActivationScreen), heartbeat useEffect 추가 |

### 2.3 기존 API (변경 없음)
- `POST /api/device/activate` — 활성화 코드 → JWT
- `POST /api/device/heartbeat` — 단말기 상태 갱신 (Authorization: Bearer)

---

## 3. 구현 순서

1. settingsStore — deviceToken 필드 추가
2. ActivationScreen 컴포넌트 생성
3. pos/page.tsx — 인증 가드 + heartbeat
4. Playwright E2E 테스트

---

## 4. 테스트 계획

| 테스트 | 기대 결과 |
|--------|---------|
| deviceToken 없이 /pos 접근 | ActivationScreen 표시 |
| 잘못된 활성화 코드 입력 | 에러 메시지 표시 |
| 올바른 활성화 코드 입력 | POS 화면 진입, termId 자동 설정 |
| heartbeat 동작 | 30초마다 호출, 단말기 status=online |
| 이미 활성화된 상태로 /pos 접근 | 바로 POS 화면 진입 |

---

*작성일: 2026-03-23*
