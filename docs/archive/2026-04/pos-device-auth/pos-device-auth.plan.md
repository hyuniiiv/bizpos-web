## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | POS가 단말기 API를 호출하지만 activate 응답에서 merchantKey(mid/encKey)를 반환하지 않아 결제 키 자동 설정이 안 됨 |
| Solution | activate API에 corner + merchantKey 추가, settingsStore에 mid/encKey 저장, ActivationScreen에서 자동 반영 |
| Function UX Effect | 활성화 코드 입력 한 번으로 결제에 필요한 모든 설정(termId, corner, mid, encKey, onlineAK) 자동 완성 |
| Core Value | 단말기 설정 오류 없이 즉시 결제 가능 상태로 진입 |

---

# pos-device-auth Plan

**Feature**: POS ↔ Device API 완전 연동
**Date**: 2026-03-24
**Phase**: Plan

## 1. 현재 상태 분석

### 이미 구현된 것 ✅
| 항목 | 위치 |
|------|------|
| ActivationScreen UI | `components/pos/ActivationScreen.tsx` |
| deviceToken 없으면 ActivationScreen 표시 | `app/pos/page.tsx` |
| Heartbeat 30초 주기 | `app/pos/page.tsx` |
| `/api/device/activate` (JWT 발급) | `app/api/device/activate/route.ts` |
| `/api/device/auth` (계정 인증 + merchantKey 반환) | `app/api/device/auth/route.ts` |
| settingsStore deviceToken/setDeviceToken | `lib/store/settingsStore.ts` |

### Gap (구현 필요) ⚠️
| 항목 | 현재 | 필요 |
|------|------|------|
| activate 응답 corner | 없음 | terminal.corner 포함 |
| activate 응답 merchantKey | 없음 | merchant_keys 조회 후 포함 |
| DeviceConfig 타입 | mid/encKey 없음 | mid, encKey 필드 추가 |
| ActivationScreen merchantKey 저장 | 없음 | updateConfig({ mid, encKey, onlineAK }) |

## 2. 구현 범위

### 2.1 `/api/device/activate` 응답 확장
- `terminal.corner` → 응답에 포함
- `terminal.merchant_key_id` 있으면 merchant_keys 조회 → `merchantKey: { id, mid, encKey, onlineAK }` 반환

### 2.2 `DeviceConfig` 타입 확장
- `mid: string` 추가 (비플페이 가맹점코드)
- `encKey: string` 추가 (AES256-CBC 암복호화 키)

### 2.3 `ActivationScreen` 응답 처리 개선
- `data.corner` → `updateConfig({ corner: data.corner })`
- `data.merchantKey` → `updateConfig({ mid, encKey, onlineAK })`

## 3. 범위 외
- `/pos/admin` 탭 추가 개선 (이미 별도 구현됨)
- Playwright 테스트 (Check 단계에서 확인)
