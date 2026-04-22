# 사원증 식수 일괄정산 — 설계 문서

**작성일**: 2026-04-21  
**상태**: 승인됨  
**범위**: inputPolicy 라우팅 + 식수기록 + 정산서 생성 (PDF/Excel)

---

## 1. 개요

기존 바코드/QR/RF카드 결제 시스템에 **식수 기록 모드**를 추가한다. 단말기별로 각 입력 타입에 대한 액션을 설정할 수 있으며, `meal_record`로 설정된 입력은 Bizplay 결제를 하지 않고 사원 식수 사용내역을 기록한다. 누적된 사용내역은 주기적으로 정산서로 집계되어 PDF/Excel 다운로드를 제공한다.

---

## 2. 운영 모드

단말기의 `input_policy` 설정으로 3가지 모드를 표현한다.

| 모드 | barcode | qr | rfcard | 용도 |
|---|---|---|---|---|
| Mode 1 — 전체 결제 | bizplay_payment | bizplay_payment | bizplay_payment | 기존 식권 단말기 |
| Mode 2 — 혼합 | bizplay_payment | bizplay_payment | meal_record | 앱 결제 + 사원증 태깅 병행 |
| Mode 3 — 식수전용 | meal_record | meal_record | meal_record | 사원번호 인코딩 바코드 또는 사원증만 사용 |

---

## 3. 데이터 모델

### 3.1 신규 테이블

#### `employees` — 고객사별 사원 정보
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
merchant_id   uuid NOT NULL REFERENCES merchants(id)
employee_no   text NOT NULL           -- 사원번호
name          text NOT NULL
department    text
card_number   text                    -- RF카드 식별번호
barcode       text                    -- 배지 바코드/QR 값
is_active     boolean NOT NULL DEFAULT true
created_at    timestamptz NOT NULL DEFAULT now()
UNIQUE (merchant_id, employee_no)
-- card_number, barcode는 NULL 허용하되 존재 시 merchant 내 유일
```

#### `meal_usages` — 식수 사용내역
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
merchant_id   uuid NOT NULL REFERENCES merchants(id)
terminal_id   uuid NOT NULL REFERENCES terminals(id)
employee_id   uuid NOT NULL REFERENCES employees(id)
meal_type     text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner'))
used_at       timestamptz NOT NULL DEFAULT now()
amount        integer NOT NULL DEFAULT 0   -- 메뉴 단가
menu_id       text
synced        boolean NOT NULL DEFAULT true
```

#### `settlements` — 정산 헤더
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
merchant_id   uuid NOT NULL REFERENCES merchants(id)
period_start  date NOT NULL
period_end    date NOT NULL
total_count   integer NOT NULL DEFAULT 0
total_amount  integer NOT NULL DEFAULT 0
status        text NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','confirmed'))
created_at    timestamptz NOT NULL DEFAULT now()
confirmed_at  timestamptz
```

#### `settlement_items` — 사원별 집계
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
settlement_id   uuid NOT NULL REFERENCES settlements(id) ON DELETE CASCADE
employee_id     uuid NOT NULL REFERENCES employees(id)
employee_no     text NOT NULL    -- 정산 시점 스냅샷
employee_name   text NOT NULL
department      text
usage_count     integer NOT NULL DEFAULT 0
total_amount    integer NOT NULL DEFAULT 0
breakfast_count integer NOT NULL DEFAULT 0
lunch_count     integer NOT NULL DEFAULT 0
dinner_count    integer NOT NULL DEFAULT 0
```

### 3.2 기존 테이블 변경

```sql
-- terminals
ALTER TABLE terminals
  ADD COLUMN input_policy jsonb NOT NULL DEFAULT
    '{"barcode":"bizplay_payment","qr":"bizplay_payment","rfcard":"bizplay_payment"}';

-- merchants
ALTER TABLE merchants
  ADD COLUMN badge_settings jsonb NOT NULL DEFAULT
    '{"dup_policy":"block","settle_day":25}';
-- dup_policy: "block" | "allow" | "warn"
-- settle_day: 1~28
```

---

## 4. 입력 라우팅

### 4.1 타입 추가 (`types/menu.ts`)

```ts
export type InputAction = 'bizplay_payment' | 'meal_record' | 'disabled'

export interface InputPolicy {
  barcode: InputAction
  qr:      InputAction
  rfcard:  InputAction
}

// DeviceConfig에 추가
inputPolicy?: InputPolicy
```

### 4.2 handleScan 분기 (`app/pos/page.tsx`)

```ts
const action = config.inputPolicy?.[identity.type] ?? 'bizplay_payment'

if (action === 'disabled') return
if (action === 'meal_record') {
  await handleMealRecord(identity.raw, identity.type)
  return
}
// 기존 Bizplay 결제 플로우 유지
```

---

## 5. 식수기록 플로우

### 5.1 단말기 (`handleMealRecord` in `lib/meal/mealRecord.ts`)

1. `POST /api/meal/record` 호출 (단말기 JWT)
2. 응답에 따라 화면 전환:
   - `ok: true` → `BadgeSuccessScreen` (사원명·끼니 표시, 3초 후 복귀)
   - `error: 'EMPLOYEE_NOT_FOUND'` → `FailScreen`
   - `error: 'DUPLICATE_BLOCKED'` → `FailScreen`
   - `error: 'DUPLICATE_WARN'` → `WarnScreen` (5초 후 자동 통과)

### 5.2 서버 (`/api/meal/record`)

1. `requireTerminalAuth` — 단말기 JWT 검증
2. `employees`에서 `card_number` 또는 `barcode` 매칭
3. 미등록 → `EMPLOYEE_NOT_FOUND`
4. `merchants.badge_settings.dup_policy` 조회
5. 당일 동일 끼니 중복 체크 (`meal_usages`)
6. 정책 적용: block → 에러 / warn → 경고 반환 / allow → 통과
7. `meal_usages` INSERT
8. `{ ok: true, employee: { name, department }, meal_type }` 반환

### 5.3 끼니 자동 판별

기존 `PeriodConfig` 시간대 기준으로 현재 시각 비교 → `meal_type` 결정.  
해당 시간대 없으면 `'lunch'` 기본값.

---

## 6. 사원 관리 (`/dashboard/employees`)

### 6.1 등록 방식

| 방식 | 설명 |
|---|---|
| CSV 업로드 | `employee_no, name, department, card_number, barcode` 컬럼 |
| 일괄 생성 | 사원번호 범위(시작~끝) 지정, 이름은 사후 편집 |
| API 연동 | `POST /api/merchant/employees/sync` 웹훅 — 인증: `X-Merchant-Key` 헤더 (대시보드 발급) |

### 6.2 UI 기능

- 고객사별 사원 목록 (페이지네이션, 검색)
- CSV 다운로드 / 업로드
- 개별 편집 (이름, 부서, 카드번호, 바코드, 활성/비활성)
- 일괄 비활성화

---

## 7. 정산 (`/dashboard/settlements`)

### 7.1 정산 생성

- **자동**: Supabase cron(`pg_cron`)이 매월 `settle_day` 00:05에 `draft` 생성 — 마이그레이션에 `cron.schedule` 포함
- **수동**: 대시보드에서 기간 선택 → "정산 생성"

**집계**: 기간 내 `meal_usages` → `employee_id`별 끼니별 횟수·금액 합산 → `settlements` + `settlement_items` INSERT

### 7.2 정산 확정

대시보드에서 내용 확인 후 "확정" → `status: 'confirmed'`, 이후 수정 불가

### 7.3 다운로드

| 형식 | 내용 | 방식 |
|---|---|---|
| PDF | 기간, 고객사명, 사원별 집계 테이블, 합계 | 서버사이드 (`@react-pdf/renderer`) — puppeteer 제외 (번들 크기) |
| Excel | 사원번호·이름·부서·조식/중식/석식 횟수·금액 | 서버사이드 (`xlsx`) |

---

## 8. 파일 목록

### 신규
```
components/pos/screens/BadgeScreen.tsx       -- 성공/경고 공용 (variant prop)
components/pos/WarnScreen.tsx                -- 중복 경고 (타이머 표시)
lib/meal/mealRecord.ts
lib/meal/employeeLookup.ts
app/api/meal/record/route.ts
app/api/meal/employees/route.ts
app/api/settlements/route.ts
app/api/settlements/[id]/route.ts
app/api/merchant/employees/route.ts
app/api/merchant/employees/sync/route.ts
app/dashboard/employees/page.tsx
app/dashboard/settlements/page.tsx
supabase/migrations/20260421000001_badge_meal_settlement.sql
```

### 변경
```
app/pos/page.tsx                               -- handleScan inputPolicy 분기
types/menu.ts                                  -- InputPolicy, InputAction 추가
lib/store/settingsStore.ts                     -- inputPolicy 초기값
app/dashboard/terminals/[id]/PosConfigForm.tsx -- inputPolicy 설정 UI
app/pos/admin/page.tsx                         -- inputPolicy 읽기전용 표시
supabase/schema.sql
```

---

## 9. 범위 외 (보류)

- 청구서 이메일 자동 발송
- 외부 급여/ERP 시스템 연동 푸시
- 사원별 월 사용 횟수 한도 설정
