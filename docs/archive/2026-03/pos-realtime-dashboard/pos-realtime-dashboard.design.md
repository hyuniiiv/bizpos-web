# pos-realtime-dashboard Design

> **Design Doc**: pos-realtime-dashboard
> **Based on Plan**: docs/01-plan/features/pos-realtime-dashboard.plan.md

---

## 1. 컴포넌트 설계

### 1.1 신규 컴포넌트

#### `components/pos/RealTimeDashboard.tsx`

| 항목 | 설명 |
|------|------|
| Props | `refreshTrigger?: number` |
| 역할 | POS 대기 화면 — 실시간 거래 목록 표시 |
| 데이터 소스 | GET `/api/transactions?date={today}&limit=100` |
| 폴링 주기 | 30초 |
| 즉시 갱신 | `refreshTrigger` prop 변경 시 즉시 fetch |

**레이아웃 구조:**
```
┌─────────────────────────────────────────┐
│ Header: termId | corner | 날짜 | 온라인  │
├──────────────────┬──────────────────────┤
│  총 거래건        │  총 매출액            │
│  (건)            │  (원)                │
├──────────────────┴──────────────────────┤
│ 거래 목록 헤더: 시간 | 사용자 | 메뉴 | 금액│
├─────────────────────────────────────────┤
│ 거래 행 (scroll)                         │
│ 시간 | 사용자명 | 메뉴명 | 금액           │
├─────────────────────────────────────────┤
│ Footer: 📡 바코드 스캔 대기 중...         │
└─────────────────────────────────────────┘
```

**필터 조건:**
- `status === 'success'` 또는 `status === 'pending_offline'` 거래만 표시
- 총 거래건/매출액은 `status === 'success'`만 집계

**TxRecord 인터페이스:**
```typescript
interface TxRecord {
  id: string
  merchantOrderID: string
  menuName: string
  userName: string
  amount: number
  status: string
  approvedAt: string
}
```

### 1.2 수정 파일

#### `app/pos/page.tsx`

| 변경 항목 | 내용 |
|---------|------|
| import 교체 | `SingleMenuScreen`, `MenuSelectScreen` → `RealTimeDashboard` |
| state 추가 | `txRefreshTrigger: number` (초기값 0) |
| 오프라인 결제 성공 | `setTxRefreshTrigger(t => t + 1)` 호출 |
| 온라인 결제 성공 | `setTxRefreshTrigger(t => t + 1)` 호출 |
| `renderMainScreen()` | `<RealTimeDashboard refreshTrigger={txRefreshTrigger} />` 반환 |

---

## 2. 데이터 흐름

```
POS 대기 화면 마운트
  → GET /api/transactions?date={today}&limit=100
  → filter: status === 'success' || 'pending_offline'
  → 요약(건수/매출) + 목록 렌더링
  → setInterval 30초마다 재조회

바코드 스캔 → 결제 성공
  → setTxRefreshTrigger(t => t + 1)
  → RealTimeDashboard useEffect 감지 → 즉시 fetch
```

---

## 3. UI 명세

| 요소 | 스타일 |
|------|--------|
| 배경 | `bg-[#0F1B4C]` (네이비) |
| 헤더 배경 | `bg-[#0B1540]` |
| 요약 카드 | `bg-white/10 rounded-xl` |
| 거래건 수 | `text-3xl font-bold text-white` |
| 매출액 | `text-2xl font-bold text-green-300` |
| 거래 목록 행 | 4열 grid: `1fr 2fr 2fr 1.5fr` |
| 금액 | `text-green-300 font-semibold` |
| 하단 바 | `animate-pulse text-blue-300` |

---

## 4. API 명세

### GET `/api/transactions`

| 파라미터 | 설명 |
|---------|------|
| `date` | YYYY-MM-DD 형식 (오늘 날짜) |
| `limit` | 최대 100건 |
| Header | `X-Internal-Key: NEXT_PUBLIC_INTERNAL_POS_KEY` |

**응답:**
```json
{
  "items": [
    {
      "id": "string",
      "merchantOrderID": "string",
      "menuName": "string",
      "userName": "string",
      "amount": 4500,
      "status": "success",
      "approvedAt": "2026-03-24T12:00:00Z"
    }
  ]
}
```
