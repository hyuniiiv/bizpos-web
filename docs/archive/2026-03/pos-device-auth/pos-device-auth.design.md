# [Design] pos-device-auth

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem Solved** | POS 화면이 device API를 호출하지 않아 단말기 인증·상태관리 불가 |
| **Solution Approach** | ActivationScreen 컴포넌트 + settingsStore JWT 필드 + heartbeat useEffect |
| **Function/UX Effect** | 최초 진입 시 활성화 코드 입력 → JWT 저장 → 이후 자동 POS 진입 |
| **Core Value** | POS-서버 인증 체계 완성 — 단말기별 JWT 인증, 30초 heartbeat online 유지 |

---

## 1. 아키텍처 설계

### 1.1 인증 흐름

```
/pos 진입
  └─ deviceToken 없음 → ActivationScreen 표시
       └─ 활성화 코드 입력 → POST /api/device/activate
            └─ 성공: JWT + termId + config 수신
                 └─ settingsStore 저장 → POS 메인 화면
  └─ deviceToken 있음 → 바로 POS 메인 화면
       └─ heartbeat 시작 (30초 interval)
```

### 1.2 컴포넌트 구조

```
app/pos/page.tsx
  ├─ mounted=false → null (SSR hydration 방지)
  ├─ deviceToken=null → <ActivationScreen />
  └─ deviceToken 있음 → POS 메인 화면
       ├─ <BarcodeReader />
       ├─ <StatusBar />
       ├─ {renderMainScreen()}
       └─ overlay screens (processing/success/fail)
```

---

## 2. 신규 컴포넌트

### 2.1 `components/pos/ActivationScreen.tsx`

**역할**: 최초 POS 시작 시 단말기 활성화 코드 입력 화면

**상태**:
| State | Type | 초기값 | 설명 |
|-------|------|--------|------|
| `code` | string | '' | 활성화 코드 입력값 (자동 대문자) |
| `loading` | boolean | false | API 호출 중 |
| `error` | string | '' | 에러 메시지 |

**API 호출**:
```
POST /api/device/activate
  Body: { activationCode: string (6자, uppercase) }
  Success (200):
    - data.accessToken → setDeviceToken(data.accessToken, data.terminalId)
    - data.termId → updateConfig({ termId })
    - data.config → updateConfig(data.config) (있을 경우)
  Error:
    - INVALID_CODE → "유효하지 않은 활성화 코드입니다."
    - ALREADY_ACTIVATED → "이미 활성화된 단말기입니다. 관리자에게 문의하세요."
    - 기타 → "활성화에 실패했습니다."
    - 네트워크 오류 → "네트워크 오류가 발생했습니다."
```

**UI 요소**:
- 입력: text input, maxLength=6, uppercase, autoFocus
- 활성화 버튼: code.length < 6 이면 disabled
- 에러 표시: 빨간 텍스트
- 수동 설정 링크: `/pos/admin`

---

## 3. 수정 파일

### 3.1 `lib/store/settingsStore.ts`

**추가 상태**:
```typescript
deviceToken: string | null      // JWT 토큰 (persist)
deviceTerminalId: string | null // 단말기 UUID (persist)
```

**추가 액션**:
```typescript
setDeviceToken: (token: string, terminalId: string) => void
clearDeviceToken: () => void
```

**persist 대상**: `bizpos-settings` 키에 포함 (localStorage)

### 3.2 `app/pos/page.tsx`

**추가 상태/로직**:

1. `mounted` state: SSR/CSR hydration 오류 방지
   ```tsx
   const [mounted, setMounted] = useState(false)
   useEffect(() => setMounted(true), [])
   if (!mounted) return null
   ```

2. Heartbeat useEffect:
   ```tsx
   useEffect(() => {
     if (!deviceToken) return
     const sendHeartbeat = async () => {
       await fetch('/api/device/heartbeat', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${deviceToken}`,
         },
         body: JSON.stringify({ status: 'online' }),
       })
     }
     sendHeartbeat()  // 즉시 1회
     const interval = setInterval(sendHeartbeat, 30_000)
     return () => clearInterval(interval)
   }, [deviceToken])
   ```

3. 인증 가드:
   ```tsx
   if (!deviceToken) return (
     <div className="flex-1 flex flex-col">
       <ActivationScreen />
     </div>
   )
   ```

---

## 4. API 명세 (기존, 변경 없음)

### POST /api/device/activate

| 필드 | 타입 | 설명 |
|------|------|------|
| activationCode | string | 6자리 대문자 활성화 코드 |

**Response (200)**:
```json
{
  "accessToken": "eyJ...",
  "terminalId": "uuid",
  "termId": "02",
  "config": { "corner": "B코너", ... }
}
```

**Error Codes**:
- `INVALID_CODE` (400): 코드 불일치 또는 만료
- `ALREADY_ACTIVATED` (409): 이미 사용된 코드

### POST /api/device/heartbeat

| Header | 값 |
|--------|----|
| Authorization | `Bearer {deviceToken}` |

**Body**: `{ "status": "online" }`

**Response (200)**: `{ "ok": true }`

---

## 5. 데이터 흐름

```
activate 응답
  ├─ accessToken → settingsStore.deviceToken (localStorage persist)
  ├─ terminalId → settingsStore.deviceTerminalId (localStorage persist)
  └─ termId + config → settingsStore.config (localStorage persist)

heartbeat
  ├─ Authorization: Bearer {deviceToken}
  └─ DB: terminals.status = 'online', last_heartbeat = now()
```

---

## 6. 테스트 케이스

| ID | 시나리오 | 기대 결과 |
|----|---------|---------|
| TC-01 | localStorage 없이 /pos 접근 | ActivationScreen 표시 |
| TC-02 | 잘못된 코드 입력 | 에러 메시지 표시 |
| TC-03 | 올바른 코드 입력 | POS 화면 진입, termId "[02]" StatusBar 표시 |
| TC-04 | activate 직후 network | POST /api/device/heartbeat 200 호출 확인 |
| TC-05 | /dashboard/terminals | 단말기 status=온라인, 마지막 접속 갱신 |

---

*작성일: 2026-03-23*
