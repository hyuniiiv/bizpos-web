---
title: store/admin 계층구조 재설계 (가맹점-매장-단말기) - 최종 설계
date: 2026-04-25
status: Design Complete
author: Claude Code + User
---

# store/admin 계층구조 재설계 (최종 설계)

## 1. Executive Summary

**목표**: 가맹점-매장-단말기 계층구조를 UI에 유기적으로 통합하고, 역할별 권한 제어를 명확히 구현한다.

**핵심 특징**:
- 가맹점 관리 페이지 신규 추가 (/merchants)
- 계층별 네비게이션: 가맹점 → 매장 → 단말기
- 플랫 라우팅 + Context 기반 필터링
- 역할별 차등화된 접근 제어 (CRUD vs 메뉴 관리)
- N개 매장/단말기를 담당하는 역할 지원

**범위**: store/admin 전체 구조 개선 (5개 주요 페이지)

---

## 2. 아키텍처

### 2.1 라우팅 구조 (플랫형)

```
app/store/admin/
├─ merchants/
│  ├─ page.tsx           → 가맹점 목록 + 상세
│  └─ [id]/page.tsx      → 가맹점 상세 페이지
├─ stores/
│  ├─ page.tsx           → 매장 목록 + 현황 대시보드
│  └─ [id]/page.tsx      → 매장 상세 페이지
├─ terminals/
│  ├─ page.tsx           → 단말기 목록 (가맹점/매장 필터링)
│  └─ [id]/page.tsx      → 단말기 상세 + 메뉴 관리
├─ members/
│  └─ page.tsx           → 멤버 관리 (역할/권한 필터링)
└─ permissions/
   └─ page.tsx           → 권한 관리 (기존)
```

### 2.2 Context 구조

```typescript
interface MerchantStoreContext {
  // 가맹점 계층
  selectedMerchantId: string | null
  merchants: Merchant[]
  
  // 매장 계층
  assignedStoreIds: string[]        // 사용자가 담당하는 매장들
  selectedStoreIds: string[]        // 현재 필터링 대상
  stores: Store[]
  
  // 단말기 계층
  assignedTerminalIds: string[]     // terminal_admin용
  
  // 사용자 정보
  userRole: Role
  userMerchantId: string | null
  
  // 헬퍼 함수
  filterByRole<T>(items: T[]): T[]
  setSelectedMerchant(id: string): void
  setSelectedStores(ids: string[]): void
}
```

### 2.3 데이터 흐름

```
1. 사용자 로그인 → Auth 확인
2. merchant_users 조회 → role, merchant_id, store_ids 획득
3. MerchantStoreContext 초기화
4. 매장 목록 자동 로드 (selectedMerchantId 기반)
5. 각 페이지에서 Context 기반 자동 필터링
```

---

## 3. 페이지 구조 & 폼 필드

### 3.1 가맹점 관리 (`/merchants`)

**목록 화면**
```
┌─────────────────────────────────────────┐
│ 가맹점 목록                             │
├─────────────────────────────────────────┤
│ 가맹점명 | 사업자번호 | 주소 | 담당자   │
│ A가맹점 | 123-45-67890 | 강남 | 김철수 │
│                         [수정] [삭제]
├─────────────────────────────────────────┤
│ [+ 새 가맹점 추가]                      │
└─────────────────────────────────────────┘
```

**생성/수정 폼**
- 가맹점명 *
- 사업자등록번호 *
- 주소 *
- 가맹점 관리자 (드롭다운) *
- 매니저 (드롭다운)
- 설명 (선택)

### 3.2 매장 관리 (`/stores`)

**목록 화면** (현황 대시보드 포함)
```
가맹점: [선택됨]

매장명 | 주소 | 상태 | 단말기수 | 멤버수
오늘 거래액 | 주간 거래액 | 활성사용자 | 상품판매량
```

**생성/수정 폼**
- 가맹점 (자동 설정, 수정 불가)
- 매장명 *
- 주소 *
- 매장 관리자 (드롭다운) *
- 매니저 (드롭다운)
- 설명 (선택)

### 3.3 단말기 관리 (`/terminals`)

**목록 화면** (매장별 그룹핑)
```
필터: 가맹점 [선택됨] | 매장 [선택됨]

[강남점]
  - 01 | POS | 활성 | [수정]
  - 02 | KIOSK | 활성 | [수정]
[서초점]
  - 01 | POS | 활성 | [수정]
```

**생성/수정 폼**

terminal_admin / platform_admin:
- 가맹점 (자동 설정)
- 매장 (자동 설정)
- 단말기 ID (01~99) *
- 모델명 (POS / KIOSK / 식권체크 / 태블릿오더) *
- 일련번호 *
- 설명
- [저장] [삭제]

merchant_admin / store_admin (메뉴 관리만):
- 단말기 ID: 03 (읽기 전용)
- 모델명: POS (읽기 전용)
- [메뉴 설정]
  - POS 메뉴: [활성 상품 선택]
  - KIOSK 메뉴: [활성 상품 선택]
  - 식권체크: [활성 상품 선택]
  - 태블릿오더: [활성 상품 선택]
- [저장]

### 3.4 멤버 관리 (`/members`)

**목록 화면**
```
필터: 가맹점 [선택됨] | 매장 [선택됨] | 역할 [전체]

이름 | 이메일/ID | 역할 | 상태
김철수 | kim@example.com | merchant_admin | 활성
                      [역할변경] [비번초기화]
```

**계정 생성 폼**

platform_admin / platform_manager:
- 이메일 *
- 성명 *
- 비밀번호 *
- 비밀번호 확인 *
- 역할 (드롭다운: 모든 역할) *
- 활성화 여부 (기본: 활성)

그 외 역할 (merchant_admin, store_admin, terminal_admin):
- ID (로그인용) *
- 성명 *
- 비밀번호 *
- 비밀번호 확인 *
- 역할 (드롭다운: 권한에 따라 선택 가능) *
- 가맹점 (자동 설정)
- 매장 (선택적, 역할에 따라)
- 활성화 여부 (기본: 활성)

---

## 4. 권한 관리 & 필터링

### 4.1 역할별 담당 범위

| 역할 | 가맹점 | 매장 | 단말기 | 메뉴 관리 | 멤버 |
|------|-------|------|-------|---------|------|
| platform_admin | 모든 항목 (CRUD) | 모든 항목 (CRUD) | 모든 항목 (CRUD) | 모든 메뉴 | 모든 멤버 |
| merchant_admin | 자신의 가맹점 | 자신의 가맹점 매장 | 메뉴 설정만 | 자신의 메뉴 | 자신의 가맹점 멤버 |
| store_admin | ❌ 접근 불가 | 담당 매장들 | 메뉴 설정만 | 담당 매장 메뉴 | 담당 매장 멤버 |
| terminal_admin | ❌ 접근 불가 | ❌ 접근 불가 | 담당 매장 (CRUD) | 담당 매장 메뉴 | ❌ 접근 불가 |

### 4.2 페이지별 접근 제어

**[/merchants]**
- platform_admin/manager: 모든 가맹점, [수정][삭제] 버튼 표시
- merchant_admin: 자신의 가맹점만, [수정] 버튼만
- 나머지: 페이지 접근 불가 (숨김)

**[/stores]**
- platform_admin/manager: 모든 매장, [수정][삭제] 가능
- merchant_admin: 자신의 가맹점 매장, [수정][삭제] 가능
- store_admin: 담당 매장만, [수정] 버튼만 (삭제 불가)
- 나머지: 접근 불가

**[/terminals]**
- platform_admin/manager: 모든 단말기, [수정][추가][삭제] 활성화
- merchant_admin: 자신의 가맹점 단말기, [메뉴 설정] 버튼만
- store_admin: 담당 매장 단말기, [메뉴 설정] 버튼만
- terminal_admin: 담당 매장 단말기, 모든 권한 (CRUD + 메뉴)
- 나머지: 접근 불가

**[/members]**
- platform_admin: 모든 멤버, 모든 역할 부여 가능
- merchant_admin: 자신의 가맹점 멤버, 제한된 역할만 부여 가능
- store_admin: 담당 매장 멤버, terminal_admin만 부여 가능
- 나머지: 접근 불가

---

## 5. 데이터 보안 (RLS 정책)

### 5.1 Row Level Security

```sql
[merchants]
- SELECT: platform만 모든 행, merchant_admin은 자신의 merchant_id만
- UPDATE/DELETE: platform만 가능

[stores]
- SELECT: platform은 모든 행
         merchant_admin은 자신의 merchant_id 매장만
         store_admin은 담당 store_ids만
- UPDATE: platform은 모든 수정, merchant_admin은 자신의 매장만, 
          store_admin은 기본 설정 제외
- DELETE: platform만 가능

[terminals]
- SELECT: platform은 모든 행
         merchant_admin은 자신의 가맹점 단말기만
         store_admin은 담당 매장 단말기만
         terminal_admin은 담당 매장 단말기만
- UPDATE: platform은 모든 권한
         merchant_admin/store_admin은 메뉴 설정만
         terminal_admin은 모든 권한
- DELETE: platform, terminal_admin만 가능

[merchant_users]
- SELECT/UPDATE: 권한 범위 내 멤버만 접근 가능
- DELETE: platform_admin만 가능
```

---

## 6. 테스트 계획

### 6.1 단위 테스트

```
✓ filterMerchants: 역할별 필터링
✓ filterStores: 담당 매장만 조회
✓ filterTerminals: 담당 단말기만 조회
✓ getAssignableRoles: 부여 가능한 역할 검증
✓ canEditTerminal: CRUD vs 메뉴 관리 구분
```

### 6.2 통합 테스트

```
✓ 가맹점 선택 → 매장 목록 자동 로드
✓ 매장 선택 → 단말기 필터링 자동 적용
✓ store_admin이 다른 매장 접근 불가
✓ merchant_admin이 단말기 추가 불가 (버튼 숨김)
✓ terminal_admin이 단말기 CRUD 가능
```

### 6.3 E2E 테스트

```
시나리오 1: platform_admin 전체 관리
시나리오 2: merchant_admin 자신의 가맹점 관리
시나리오 3: store_admin 담당 매장 메뉴 관리
시나리오 4: terminal_admin 단말기 전체 관리
시나리오 5: 역할별 계정 생성 (이메일 vs ID)
```

---

## 7. 구현 순서

### Phase 1: Context & 인프라
1. MerchantStoreContext 확장 (assignedStoreIds, assignedTerminalIds)
2. 필터링 함수 구현
3. RLS 정책 검토

### Phase 2: 페이지 구현
1. /merchants 페이지 신규
2. /stores 페이지 수정 (현황 추가)
3. /terminals 페이지 수정 (메뉴 관리 분리)
4. /members 페이지 수정 (계정 생성 추가)

### Phase 3: 권한 제어
1. 각 페이지 권한 검증
2. 버튼/폼 활성화 제어

### Phase 4: 테스트
1. 단위 테스트
2. 통합 테스트
3. E2E 테스트

---

## 8. 주요 변경점

| 항목 | 기존 | 변경 | 이유 |
|------|------|------|------|
| 가맹점 관리 | 없음 | /merchants 신규 | 가맹점 CRUD 기능 |
| 단말기 ID | 전역 유니크 | 매장별 독립 (01~99) | 운영 편의성 |
| 단말기 권한 | 단순 | CRUD vs 메뉴 분리 | 운영자 보호 |
| 계정 생성 | 초대만 | 직접 생성 | Admin 제어 |
| store_admin | 1개 매장 | N개 매장 담당 가능 | 유연한 운영 |

---

## 9. 설계 승인 기록

| 섹션 | 내용 | 상태 |
|------|------|------|
| 섹션 1 | 아키텍처 (라우팅, Context) | ✅ 승인 |
| 섹션 2 | 페이지 구조 & 폼 필드 | ✅ 승인 |
| 섹션 3 | 권한 관리 & 필터링 | ✅ 승인 |
| 섹션 4 | 데이터 보안 (RLS) | ✅ 승인 |
| 섹션 5 | 테스트 계획 | ✅ 승인 |

---

**최종 상태**: ✅ Design Complete - 구현 준비 완료
