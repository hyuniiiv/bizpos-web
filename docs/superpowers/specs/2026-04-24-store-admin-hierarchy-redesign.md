---
title: store/admin 계층구조 재설계 (가맹점-매장-단말기)
date: 2026-04-24
status: Draft
author: Claude Code
---

# store/admin 계층구조 재설계

## 1. Executive Summary

**목표**: store/admin 화면을 가맹점(merchant) → 매장(store) → 단말기(terminal)의 3단계 계층구조에 맞게 재설계하고, 9개 role 기반 권한 관리를 구현한다.

**핵심 성과**:
- 가맹점-매장-단말기가 유기적으로 연결되는 UI 구성
- store_admin은 자기 매장의 단말기/멤버만 조회·수정 가능
- 동일 term_id가 다른 매장에서 충돌 없이 등록 (per-store 방식)
- 기존 3개 버그 동시 수정: merchant_users role CHECK, RLS cross-tenant 누수, N+1 쿼리

**범위**: 6단계 구현 (Phase 0 ~ Phase 1b)  
**예상 기간**: 3~4주 (병렬 처리 시 2주)  
**위험도**: High (RLS 정책 변경, 스키마 마이그레이션)

---

## 2. Current State Analysis

### 발견된 3개 기존 버그

| # | 버그 | 위치 | 영향 | 심각도 |
|----|------|------|------|--------|
| 1 | merchant_users role CHECK가 3개만 허용 | `20260421000002:57` | 9개 role 중 6개를 저장할 수 없음 | 🔴 Critical |
| 2 | RLS 정책에 merchant_id 스코프 없음 | `20260424000007:34-40` | merchant A의 terminal_admin이 merchant B의 단말기 수정 가능 | 🔴 Critical |
| 3 | MembersPage N+1 쿼리 | `members/page.tsx:42-47` | 각 사용자마다 `getUserById` 호출 | 🟡 Medium |

### 현재 스키마 상태

- ✅ `terminals.store_id` 컬럼: 이미 존재 (nullable, 인덱스 없음)
- ✅ `merchants`, `stores`, `terminals` 테이블: 기본 구조 완성
- ❌ `terminals.store_id` 백필: 미완료
- ❌ `UNIQUE(store_id, term_id)` 제약: 미적용 (현재 `UNIQUE(merchant_id, term_id)`)
- ❌ 9개 role 체계: 코드만 존재, DB 제약 미반영

### 운영 환경

- 🟡 **아직 프로덕션 미운영** → 무중단 배포 필요 최소화, 초기 데이터 정합성 우선

---

## 3. Requirements

### 3.1 역할(Role) 체계

```
9개 Role (계층별):
├─ platform_admin        (플랫폼 전체 관리)
├─ platform_manager      (플랫폼 운영)
├─ merchant_admin        (가맹점 관리)
├─ merchant_manager      (가맹점 운영)
├─ store_admin           (매장 관리)
├─ store_manager         (매장 운영)
├─ terminal_admin        (단말기 관리)
├─ client_admin          (고객사 관리)
└─ client_manager        (고객사 운영)
```

### 3.2 기능 요구사항

1. **계층 네비게이션**: MerchantSwitcher + StoreSwitcher (breadcrumb 형태)
2. **매장별 필터링**: 각 페이지에서 선택된 매장의 데이터만 표시
3. **단말기 ID 그룹핑**: per-store (각 매장에서 01~99 독립 사용 가능)
4. **N+1 쿼리 제거**: Members 조회 최적화
5. **권한 기반 UI**: role별로 접근 가능한 메뉴/폼만 노출

---

## 4. Architecture Overview

### 4.1 계층구조 다이어그램

```
Platform (플랫폼 관리자)
 └─ Merchant (가맹점) ─── merchant_admin, merchant_manager
    └─ Store (매장) ───── store_admin, store_manager
       └─ Terminal ──── terminal_admin
```

### 4.2 데이터 흐름

```
권한 검증 (RLS 정책)
 └─ merchant_id + store_id 스코프 검증
    └─ role별 CRUD 제어
       └─ API 응답 (enum 백필, aggregation 제외)
```

---

## 5. Implementation Plan Overview

### Phase 순서

| Phase | 이름 | 특징 | 소요 일수 |
|-------|------|------|---------|
| **P0-a** | role CHECK 확장 | additive | 1 |
| **P0-b** | RLS 정책 스코프 추가 | additive with guard | 2 |
| **P0-c** | has_role 함수 보강 | 신규 함수 | 1 |
| **P1a** | terminals.store_id 완성 | additive | 2 |
| **P2** | API 계층 (스코핑) | 권한 검증 | 3 |
| **P3** | StoreSwitcher + 컨텍스트 | React Context | 2 |
| **P4** | UI 재구성 | 페이지 분할 | 4 |
| **P5** | Members 권한 필터 + N+1 | 최적화 | 2 |
| **P1b** | finalize (파괴적) | NOT NULL 승격 | 1 |

**총 소요**: 18 일 (병렬 처리 시 7~10 일)

---

## 6. Phase별 상세 작업

### Phase 0-a: merchant_users Role CHECK 확장

**목표**: 3개 role → 9개 role 허용  
**파일**: `supabase/migrations/20260425000001_fix_merchant_users_role_check.sql`

```sql
ALTER TABLE merchant_users DROP CONSTRAINT IF EXISTS merchant_users_role_check;
ALTER TABLE merchant_users
  ADD CONSTRAINT merchant_users_role_check
  CHECK (role IN (
    'platform_admin', 'platform_manager',
    'merchant_admin', 'merchant_manager',
    'store_admin', 'store_manager',
    'terminal_admin'
  ));
```

---

### Phase 0-b: RLS 정책 merchant_id 스코프 추가

**목표**: cross-tenant 누수 방지  
**파일**: `supabase/migrations/20260425000002_fix_rls_cross_tenant.sql`

**변경 대상**: 5개 정책 (stores_select, stores_manage, terminals_select, terminals_manage_lifecycle, terminals_manage_settings)

**변경 방식**:
```sql
-- Before
CREATE POLICY "terminals_manage_lifecycle" ON terminals FOR ALL USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'terminal_admin'])
);

-- After
CREATE POLICY "terminals_manage_lifecycle" ON terminals FOR ALL USING (
  has_role(ARRAY['platform_admin', 'platform_manager', 'terminal_admin'])
  AND merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);
```

---

### Phase 0-c: has_role 함수 보강

**목표**: merchant_id 검증 함수화  
**파일**: `supabase/migrations/20260425000003_add_has_role_in_merchant.sql`

```sql
CREATE OR REPLACE FUNCTION has_role_in_merchant(
  required_roles text[],
  target_merchant_id uuid
) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM merchant_users
    WHERE user_id = auth.uid()
      AND role = ANY(required_roles)
      AND merchant_id = target_merchant_id
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

### Phase 1a: terminals.store_id 완성

**목표**: 컬럼 백필, 인덱스, ON DELETE  
**파일**: `supabase/migrations/20260425000004_complete_terminals_store_id.sql`

```sql
-- 1. 인덱스
CREATE INDEX IF NOT EXISTS idx_terminals_store_id ON terminals(store_id);
CREATE INDEX IF NOT EXISTS idx_terminals_merchant_store ON terminals(merchant_id, store_id);

-- 2. 백필: 기본매장 생성 + 연결
DO $$ DECLARE mid UUID; BEGIN
  FOR mid IN SELECT DISTINCT merchant_id FROM terminals WHERE store_id IS NULL
  LOOP
    INSERT INTO stores (merchant_id, store_name, is_active)
    VALUES (mid, '기본매장', true) ON CONFLICT DO NOTHING;
    UPDATE terminals SET store_id = (SELECT id FROM stores WHERE merchant_id = mid LIMIT 1)
    WHERE merchant_id = mid AND store_id IS NULL;
  END LOOP;
END $$;

-- 3. FK ON DELETE
ALTER TABLE terminals DROP CONSTRAINT IF EXISTS terminals_store_id_fkey;
ALTER TABLE terminals ADD CONSTRAINT terminals_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT;
```

---

### Phase 2: API 계층

**파일**: `app/api/terminals/route.ts`, `app/api/merchant/members/route.ts`

**변경**:
1. **POST /api/terminals**: `store_id` 필수 + merchant 검증
2. **GET /api/merchant/members**: store-scoped role 필터
3. **/api/device/activate**: 응답에 `store_id` 포함 (POS 호환)

---

### Phase 3: StoreSwitcher + 컨텍스트

**파일**: `app/store/admin/StoreSwitcher.tsx` (신규), `app/store/admin/layout.tsx`

**구현**: MerchantSwitcher 패턴으로 StoreSwitcher 작성, `bp_selected_store` 쿠키

---

### Phase 4: UI 재구성

**파일**: 
- `app/store/admin/stores/` (분할)
- `app/store/admin/stores/[id]/page.tsx` (신규 상세)
- `app/store/admin/terminals/page.tsx` (필터)

---

### Phase 5: Members 권한 필터 + N+1 수정

**파일**: `app/store/admin/members/page.tsx`

**변경**: `listUsers()` 단일 호출 + role별 필터

---

### Phase 1b: finalize

**파일**: `supabase/migrations/20260425000010_finalize_store_hierarchy.sql`

```sql
ALTER TABLE terminals ALTER COLUMN store_id SET NOT NULL;
CREATE UNIQUE INDEX CONCURRENTLY idx_terminals_store_term_unique
  ON terminals(store_id, term_id);
```

**실행 조건**: P0~P5 완료 + 1주 관찰

---

## 7. Testing Strategy

### RLS 매트릭스 (pgTAP)
- 9 roles × 4 tables × 2 ops = 72 테스트 케이스

### Cross-Tenant E2E
- merchant A 사용자가 merchant B 리소스 접근 시도 → 403

### 마이그레이션 검증
- Phase 1a 전후: `SELECT COUNT(*) FROM terminals WHERE store_id IS NULL` → 0

### POS 호환성
- /api/device/activate 응답 포맷 유지

---

## 8. Deployment Strategy

### 순서
1. P0 (스키마) → 모니터링
2. P1a (additive) → 마이그레이션 먼저
3. P2~5 (점진적) → 코드 배포
4. P1b (finalize) → 1주 후

### 무중단 원칙
- P1a까지: NULL 허용
- P2~5: 신/구 API 병렬
- P1b: NOT NULL 승격 (완전 전환)

---

## 9. Risk Mitigation

| 위험 | 영향 | 발생확률 | 완화 |
|------|------|---------|------|
| CHECK 확장 후 권한 폐기 | High | Low | has_role 함수로 검증 |
| RLS 정책 변경 | Critical | Medium | down migration + dry-run |
| POS 호환성 | Critical | High | store_id는 응답만, 요청 불필요 |
| 백필 실패 | High | Low | exception handling |

---

## 10. Open Questions & Decisions

### Q6: store_managers 유지?
- ✅ **YES** — 기존 테이블 활용, merchant/store 분리

### Q7: 백필 전략?
- ✅ **(1) Default Store 자동 생성** — 초기 데이터 정합성 우선

### Q8: has_role 함수?
- ✅ **신규 함수** `has_role_in_merchant()` 추가

---

## 11. Success Criteria

- [ ] 9개 role 모두 INSERT 가능
- [ ] RLS cross-tenant 검증 PASS
- [ ] terminals 100% store_id 백필
- [ ] 72 RLS 테스트 PASS
- [ ] POS /api/device/activate 무중단
- [ ] N+1 제거 (listUsers 단일 호출)
- [ ] Phase 1b NOT NULL 승격 성공

---

**다음 단계**: advisor 2차 검토 → 사용자 최종 승인 → Phase 0 구현
