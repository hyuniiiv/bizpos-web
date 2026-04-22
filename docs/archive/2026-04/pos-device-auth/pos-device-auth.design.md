# pos-device-auth Design

**Feature**: POS ↔ Device API 완전 연동
**Date**: 2026-03-24
**Phase**: Design

---

## 1. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `types/menu.ts` | 수정 | `DeviceConfig`에 `mid`, `encKey` 필드 추가 |
| `app/api/device/activate/route.ts` | 수정 | `corner` + `merchantKey` 응답에 포함 |
| `components/pos/ActivationScreen.tsx` | 수정 | `corner`, `merchantKey` → `updateConfig` 적용 |

---

## 2. 상세 설계

### 2.1 `types/menu.ts` — DeviceConfig 확장

```typescript
export interface DeviceConfig {
  // 기존 필드 유지
  termId: string
  merchantId: string
  onlineAK: string
  bizNo: string
  corner: string
  adminPin: string
  serialPort: string
  offlineMode: boolean
  apiEnv: 'production' | 'development'
  autoResetTime: string
  barcodeReaderType: 'keyboard' | 'serial' | 'camera'
  barcodePort: string
  externalDisplay: boolean
  // 추가
  mid: string          // 비플페이 가맹점코드 MID
  encKey: string       // AES256-CBC 암복호화 키
}
```

settingsStore 기본값에도 `mid: ''`, `encKey: ''` 추가.

---

### 2.2 `/api/device/activate` 응답 확장

**기존:**
```typescript
return NextResponse.json({
  terminalId, termId, accessToken, merchantId, config, configVersion
})
```

**변경 후:**
```typescript
// terminal.merchant_key_id 있으면 merchant_keys 조회
let merchantKey = null
if (terminal.merchant_key_id) {
  const { data: mk } = await supabase
    .from('merchant_keys')
    .select('mid, enc_key, online_ak')
    .eq('id', terminal.merchant_key_id)
    .single()
  if (mk) merchantKey = {
    id: terminal.merchant_key_id,
    mid: mk.mid,
    encKey: mk.enc_key,
    onlineAK: mk.online_ak,
  }
}

return NextResponse.json({
  terminalId, termId, accessToken, merchantId, config, configVersion,
  corner: terminal.corner,          // 추가
  merchantKey,                      // 추가 (null 가능)
})
```

---

### 2.3 `ActivationScreen` 응답 처리

**기존:**
```typescript
setDeviceToken(data.accessToken, data.terminalId)
await updateConfig({ termId: data.termId ?? '', ...(data.config ?? {}) })
```

**변경 후:**
```typescript
setDeviceToken(data.accessToken, data.terminalId)
const configUpdate: Partial<DeviceConfig> = {
  termId: data.termId ?? '',
  ...(data.corner ? { corner: data.corner } : {}),
  ...(data.merchantKey ? {
    mid: data.merchantKey.mid,
    encKey: data.merchantKey.encKey,
    onlineAK: data.merchantKey.onlineAK,
  } : {}),
  ...(data.config ?? {}),
}
await updateConfig(configUpdate)
```

---

## 3. 데이터 흐름

```
POS 진입
  └─ deviceToken 없음?
       └─ ActivationScreen 표시
            └─ 코드 입력 → POST /api/device/activate
                 └─ 응답: { accessToken, termId, corner, merchantKey, config }
                      └─ setDeviceToken(accessToken, terminalId)
                      └─ updateConfig({ termId, corner, mid, encKey, onlineAK, ...config })
                      └─ → POS 메인 화면 (deviceToken 있으므로)
```

---

## 4. 기존 Heartbeat / 인증 흐름 (변경 없음)

- `pos/page.tsx` useEffect: `deviceToken` 있을 때 30초 heartbeat ✅
- `pos/layout.tsx`: 변경 없음 ✅
