# BIZPOS 온라인 관리 — Supabase 초기 설정 가이드

이 문서는 BIZPOS 온라인 관리 시스템의 Supabase 백엔드를 처음 설정하는 절차를 단계별로 안내합니다.

---

## 목차

1. [Supabase 프로젝트 생성](#1-supabase-프로젝트-생성)
2. [환경변수 설정](#2-환경변수-설정)
3. [스키마 적용](#3-스키마-적용)
4. [RLS 활성화 확인](#4-rls-활성화-확인)
5. [Auth 이메일 설정](#5-auth-이메일-설정)
6. [첫 관리자 계정 생성](#6-첫-관리자-계정-생성)
7. [단말기 활성화 절차](#7-단말기-활성화-절차)
8. [운영 전 체크리스트](#8-운영-전-체크리스트)

---

## 1. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 에 접속하여 로그인합니다.
2. **New project** 버튼을 클릭합니다.
3. 아래 정보를 입력합니다.

   | 항목 | 권장값 |
   |------|--------|
   | Project name | `bizpos-online` (또는 원하는 이름) |
   | Database Password | 16자 이상의 강력한 비밀번호 (메모해두세요) |
   | Region | `Northeast Asia (Seoul)` |
   | Pricing plan | Free 또는 Pro |

4. **Create new project** 클릭 후 약 1~2분 대기합니다.
5. 생성 완료 후 프로젝트 대시보드로 이동합니다.

---

## 2. 환경변수 설정

### API 키 확인

**Dashboard > Project Settings > API** 에서 아래 값을 복사합니다.

| 환경변수 | Dashboard 위치 | 설명 |
|----------|---------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | 프로젝트 고유 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` 키 | 클라이언트용 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` 키 | 서버 전용 관리자 키 (절대 클라이언트에 노출 금지) |

### .env.local 파일 생성

프로젝트 루트(`bizpos-web/`)에 `.env.local` 파일을 생성합니다.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# 비플 PG (단말기 JWT 발급용)
BEEPLE_API_KEY=<비플_API_키>
BEEPLE_MERCHANT_ID=<비플_가맹점_코드>
```

> **주의**: `.env.local`은 절대 Git에 커밋하지 마세요. `.gitignore`에 등록되어 있는지 확인하세요.

---

## 3. 스키마 적용

**Dashboard > SQL Editor** 에서 아래 순서로 파일 내용을 붙여넣고 실행합니다.

### 실행 순서

```
Step 1: supabase/schema.sql
Step 2: supabase/migrations/20260320000001_add_transaction_columns.sql
Step 3: supabase/migrations/20260320000002_add_offline_detection.sql
Step 4: supabase/seed.sql  (테스트 환경에서만)
```

### schema.sql 적용 시 생성되는 테이블

| 테이블 | 역할 |
|--------|------|
| `merchants` | 가맹점 정보 (사업자번호, 비플 가맹점 코드) |
| `merchant_users` | 가맹점 ↔ Auth 사용자 연결 (다대다) |
| `terminals` | 단말기 정보 및 활성화 코드 |
| `terminal_configs` | 단말기 설정 이력 (버전 관리) |
| `transactions` | 결제 거래 내역 |

### migrations 적용 내용

- `20260320000001`: `transactions` 테이블에 `user_name`, `tid`, `cancelled_at` 컬럼 추가
- `20260320000002`: 단말기 오프라인 감지 함수(`mark_stale_terminals_offline`, `check_terminal_health`) 추가

> **팁**: `schema.sql`은 모든 `CREATE TABLE`에 `IF NOT EXISTS`를 사용하므로 이미 테이블이 있는 환경에서도 안전하게 재실행할 수 있습니다.

---

## 4. RLS 활성화 확인

Row Level Security(RLS)는 `schema.sql`에서 자동으로 활성화됩니다. 적용 여부를 확인합니다.

**Dashboard > Table Editor** 에서 각 테이블의 자물쇠(🔒) 아이콘이 표시되는지 확인하거나, 아래 SQL로 검증합니다.

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

모든 테이블의 `rowsecurity` 값이 `true`이어야 합니다.

### 적용된 RLS 정책 요약

| 테이블 | 정책 | 내용 |
|--------|------|------|
| `merchant_users` | SELECT | 본인 레코드(`user_id = auth.uid()`)만 조회 |
| `terminals` | ALL | 본인 가맹점 소속 단말기만 접근 |
| `terminal_configs` | ALL | 본인 가맹점 소속 단말기 설정만 접근 |
| `transactions` | SELECT | 본인 가맹점 거래내역만 조회 |

> **참고**: `transactions` INSERT는 서버 측 `service_role` 키를 사용하는 API Route에서만 수행합니다.

---

## 5. Auth 이메일 설정

### 이메일 인증 설정

**Dashboard > Authentication > Providers > Email** 에서 확인합니다.

| 옵션 | 권장 설정 |
|------|-----------|
| Enable Email provider | ON |
| Confirm email | ON (운영 환경) / OFF (개발 환경) |
| Secure email change | ON |

### SMTP 설정 (운영 환경)

무료 플랜의 기본 이메일 발송 한도는 낮으므로, 운영 환경에서는 외부 SMTP를 연결합니다.

**Dashboard > Project Settings > Auth > SMTP Settings**

```
SMTP Host: smtp.gmail.com (또는 SendGrid, AWS SES 등)
SMTP Port: 587
SMTP User: <발신 이메일>
SMTP Pass: <앱 비밀번호>
Sender name: BIZPOS 관리시스템
Sender email: noreply@yourdomain.com
```

### 이메일 템플릿 (선택)

**Dashboard > Authentication > Email Templates** 에서 가입 환영 메일, 비밀번호 재설정 메일 내용을 한국어로 수정할 수 있습니다.

---

## 6. 첫 관리자 계정 생성

### Step 1: Auth에서 사용자 생성

**Dashboard > Authentication > Users > Invite user** 를 클릭합니다.

```
Email: admin@yourcompany.com
```

초대 이메일이 발송되며, 수신자가 비밀번호를 설정하면 계정이 활성화됩니다.

> 또는 **Add user > Create new user** 로 비밀번호를 직접 지정할 수도 있습니다 (개발 환경에서 편리).

### Step 2: 가맹점 생성

**Dashboard > SQL Editor** 에서 실행합니다.

```sql
INSERT INTO merchants (name, biz_no, merchant_id, contact_email)
VALUES (
  '실제 가맹점명',
  '123-45-67890',      -- 사업자등록번호
  'M2024001234',        -- 비플 가맹점 코드
  'admin@yourcompany.com'
);
```

### Step 3: 관리자 계정과 가맹점 연결

생성된 사용자의 UUID를 확인합니다.

```sql
-- Auth 사용자 UUID 확인
SELECT id, email FROM auth.users WHERE email = 'admin@yourcompany.com';
```

연결 레코드를 삽입합니다.

```sql
INSERT INTO merchant_users (merchant_id, user_id, role)
VALUES (
  (SELECT id FROM merchants WHERE biz_no = '123-45-67890'),
  '<위에서 확인한 UUID>',
  'admin'
);
```

### 확인

관리자 계정으로 웹 로그인 후 가맹점 대시보드가 정상 표시되면 완료입니다.

---

## 7. 단말기 활성화 절차

단말기(키오스크/POS)가 관리 시스템과 통신하려면 아래 절차를 따릅니다.

### Step 1: 단말기 등록 및 활성화 코드 생성

**웹 관리화면** 또는 SQL로 단말기를 등록합니다.

```sql
INSERT INTO terminals (merchant_id, term_id, name, corner, activation_code, status)
VALUES (
  (SELECT id FROM merchants WHERE merchant_id = 'M2024001234'),
  'TERM-001',         -- 단말기 고유 식별자
  '1번 키오스크',
  '메인홀',
  'ABCD1234',         -- 8자리 활성화 코드 (대문자+숫자 조합 권장)
  'offline'
);
```

> **보안**: 활성화 코드는 단말기에 한 번만 입력됩니다. 코드 사용 후 `activation_code`를 NULL로 초기화하는 처리를 API에서 수행합니다.

### Step 2: 단말기 앱에서 활성화 코드 입력

1. 단말기 앱을 실행합니다.
2. 초기 설정 화면에서 **활성화 코드**(예: `ABCD1234`)를 입력합니다.
3. 앱이 `/api/terminal/activate` 엔드포인트로 코드를 전송합니다.

### Step 3: JWT 발급 흐름

```
단말기 앱
  → POST /api/terminal/activate { activation_code: 'ABCD1234' }
  → 서버: terminals 테이블에서 코드 검증
  → 서버: access_token(JWT) 생성 후 terminals.access_token에 저장
  → 응답: { access_token, terminal_id, merchant_id, config }
단말기 앱
  → 이후 모든 API 요청 시 Authorization: Bearer <access_token> 헤더 포함
```

### Step 4: 활성화 완료 확인

```sql
-- 활성화 상태 확인
SELECT term_id, name, status, last_seen_at, access_token IS NOT NULL AS has_token
FROM terminals
WHERE merchant_id = (SELECT id FROM merchants WHERE merchant_id = 'M2024001234');
```

`has_token = true`이고 `status = 'online'`이면 정상 활성화된 것입니다.

### 오프라인 감지

단말기가 **60초** 이상 heartbeat를 보내지 않으면 자동으로 `offline`으로 전환됩니다.

```sql
-- 수동으로 오프라인 감지 실행
SELECT check_terminal_health();
```

---

## 8. 운영 전 체크리스트

아래 항목을 모두 확인한 후 운영 환경으로 전환하세요.

### 보안

- [ ] `.env.local`이 `.gitignore`에 등록되어 있는가
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 서버 코드에서만 사용되는가 (클라이언트 번들에 포함 여부 확인)
- [ ] 모든 테이블에 RLS가 활성화되어 있는가 (`rowsecurity = true`)
- [ ] `seed.sql`의 테스트 데이터가 운영 DB에 적용되지 않았는가
- [ ] 활성화 코드가 실제 사용 후 NULL 처리되는가

### 스키마

- [ ] `schema.sql` 적용 완료
- [ ] `migrations/` 내 파일 모두 순서대로 적용 완료
- [ ] 인덱스 생성 확인 (`idx_transactions_merchant`, `idx_transactions_terminal`, `idx_transactions_order_id`)

### Auth

- [ ] 이메일 인증 설정 확인 (운영: Confirm email ON)
- [ ] SMTP 외부 서버 연결 완료 (Supabase 기본 발송 한도 초과 방지)
- [ ] 관리자 계정 생성 및 `merchant_users` 연결 완료

### 단말기

- [ ] 모든 단말기가 `activation_code`로 정상 활성화 완료
- [ ] heartbeat API 정상 동작 확인 (60초 주기)
- [ ] `check_terminal_health()` 함수 호출 스케줄 설정 (Supabase Cron 또는 외부 크론)

### 기능

- [ ] 관리자 로그인 → 대시보드 접근 확인
- [ ] 단말기 목록 및 상태 표시 확인
- [ ] 거래내역 조회 확인 (RLS 정책 적용 여부)
- [ ] 단말기 설정 저장/로드 확인

### Supabase Cron 설정 (오프라인 감지 자동화)

**Dashboard > Database > Extensions** 에서 `pg_cron`을 활성화한 후:

```sql
-- 1분마다 오프라인 단말기 감지 실행
SELECT cron.schedule(
  'check-terminal-health',
  '* * * * *',
  'SELECT mark_stale_terminals_offline()'
);
```

---

## 참고 링크

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth 이메일 설정](https://supabase.com/docs/guides/auth/auth-smtp)
- [pg_cron 스케줄러](https://supabase.com/docs/guides/database/extensions/pg_cron)
