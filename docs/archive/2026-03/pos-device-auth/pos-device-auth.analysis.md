# [Analysis] pos-device-auth

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: bizpos-web
> **Analyst**: gap-detector
> **Date**: 2026-03-23
> **Design Doc**: [pos-device-auth.design.md](../02-design/features/pos-device-auth.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Design 문서(pos-device-auth.design.md)와 실제 구현 코드 간의 일치도를 검증하여, POS 단말기 인증 피처가 설계 의도대로 구현되었는지 확인한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/pos-device-auth.design.md`
- **Implementation Files**:
  - `components/pos/ActivationScreen.tsx`
  - `lib/store/settingsStore.ts`
  - `app/pos/page.tsx`
- **Analysis Date**: 2026-03-23

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 97% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **98%** | **PASS** |

---

## 3. Gap Analysis (Design vs Implementation)

### 3.1 ActivationScreen Component

#### States

| Design | Type | Implementation | Status |
|--------|------|----------------|:------:|
| `code` | `string, ''` | `useState('')` L6 | ✅ MATCH |
| `loading` | `boolean, false` | `useState(false)` L7 | ✅ MATCH |
| `error` | `string, ''` | `useState('')` L8 | ✅ MATCH |

#### API Call (POST /api/device/activate)

| Design Item | Implementation Location | Status |
|-------------|------------------------|:------:|
| Body: `{ activationCode: string(6, uppercase) }` | L19: `code.toUpperCase()` | ✅ MATCH |
| Success: `setDeviceToken(data.accessToken, data.terminalId)` | L28 | ✅ MATCH |
| Success: `updateConfig({ termId: data.termId })` | L29 | ✅ MATCH |
| Success: `updateConfig(data.config)` if exists | L30 | ✅ MATCH |
| Error: INVALID_CODE → "유효하지 않은 활성화 코드입니다." | L23 | ✅ MATCH |
| Error: ALREADY_ACTIVATED → "이미 활성화된 단말기입니다..." | L24 | ✅ MATCH |
| Error: generic → "활성화에 실패했습니다." | L25 | ✅ MATCH |
| Error: network → "네트워크 오류가 발생했습니다." | L32-33 catch | ✅ MATCH |

#### UI Elements

| Design Item | Implementation | Status |
|-------------|----------------|:------:|
| text input, maxLength=6 | `maxLength={6}` | ✅ MATCH |
| uppercase auto-conversion | `.toUpperCase()` + CSS `uppercase` | ✅ MATCH |
| autoFocus | `autoFocus` L53 | ✅ MATCH |
| button disabled when code.length < 6 | `disabled={loading \|\| code.length < 6}` | ✅ MATCH |
| error in red text | `className="text-red-500"` | ✅ MATCH |
| manual settings link `/pos/admin` | `<a href="/pos/admin">` | ✅ MATCH |

### 3.2 settingsStore

| Design Item | Implementation Location | Status |
|-------------|------------------------|:------:|
| `deviceToken: string \| null` | Interface L10, init L42 | ✅ MATCH |
| `deviceTerminalId: string \| null` | Interface L11, init L43 | ✅ MATCH |
| `setDeviceToken(token, terminalId)` | L53 | ✅ MATCH |
| `clearDeviceToken()` | L54 | ✅ MATCH |
| persist key: `bizpos-settings` | L62 | ✅ MATCH |

### 3.3 pos/page.tsx

#### mounted state

| Design Item | Implementation | Status |
|-------------|----------------|:------:|
| `const [mounted, setMounted] = useState(false)` | L32 | ✅ MATCH |
| `useEffect(() => setMounted(true), [])` | L33 | ✅ MATCH |
| `if (!mounted) return null` | L319 | ✅ MATCH |

#### Heartbeat useEffect

| Design Item | Implementation | Status |
|-------------|----------------|:------:|
| Guard: `if (!deviceToken) return` | L37 | ✅ MATCH |
| URL: `/api/device/heartbeat` | L40 | ✅ MATCH |
| Method: POST | L41 | ✅ MATCH |
| Header: `Authorization: Bearer ${deviceToken}` | L44 | ✅ MATCH |
| Body: `{ status: 'online' }` | L46 | ✅ MATCH |
| Immediate call: `sendHeartbeat()` | L50 | ✅ MATCH |
| Interval: `setInterval(sendHeartbeat, 30_000)` | L51 | ✅ MATCH |
| Cleanup: `return () => clearInterval(interval)` | L52 | ✅ MATCH |

#### Authentication guard

| Design Item | Implementation | Status |
|-------------|----------------|:------:|
| `if (!deviceToken)` → `<ActivationScreen />` | L320-324 | ✅ MATCH |

---

## 4. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 98%                     |
+---------------------------------------------+
|  MATCH:            33 items (100%)           |
|  Added (impl):      2 items  (UX 개선)       |
|  Missing (impl):    0 items  (0%)            |
|  Changed:           0 items  (0%)            |
+---------------------------------------------+
```

---

## 5. Differences Found

### 5.1 Added (Design에 없음, 구현에 있음)

| # | Item | Location | Description | Impact |
|---|------|----------|-------------|--------|
| 1 | Error clear on input | ActivationScreen.tsx:50 | `onChange`에서 `setError('')` — 입력 시 에러 자동 클리어 | Low (UX 개선) |
| 2 | Heartbeat try/catch | pos/page.tsx:39,48 | heartbeat silent fail 처리 | Low (안정성 개선) |

### 5.2 Missing (Design에 있음, 구현에 없음)

없음.

### 5.3 Unused Code

| # | Item | Location | Description |
|---|------|----------|-------------|
| 1 | `clearDeviceToken()` | settingsStore.ts:54 | 정의됨, 미호출 — 향후 단말기 해제 기능에 사용 예정 |

---

## 6. Conclusion

pos-device-auth 피처는 Design 문서의 모든 명세를 구현하였다. 33개 항목 모두 일치, 2개 추가 개선 사항은 설계 의도와 상충하지 않는다.

- **Match Rate: 98%** → ✅ PASS (임계값 90% 초과)
- **Act (iterate) 단계 불필요**
- `/pdca report pos-device-auth` 진행 가능

---

*분석일: 2026-03-23 | gap-detector*
