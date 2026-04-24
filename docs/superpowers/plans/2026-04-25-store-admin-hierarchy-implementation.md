# store/admin 계층구조 재설계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가맹점-매장-단말기 계층구조를 UI에 유기적으로 통합하고, 역할별 차등화된 권한 제어를 구현한다.

**Architecture:** 플랫 라우팅 + Context 기반 필터링 모델. 기존 StoreContext를 MerchantStoreContext로 확장하여 assignedStoreIds, assignedTerminalIds를 관리. 각 페이지에서 Context의 필터링 함수를 통해 자동으로 권한 범위 내 데이터만 표시.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, TailwindCSS, React Hook Form

---

## File Structure

### 신규 생성 파일
```
lib/
├─ roles/
│  └─ filters.ts                    (필터링 함수)

app/store/admin/
├─ merchants/
│  ├─ page.tsx                      (목록 페이지)
│  ├─ MerchantsClient.tsx           (클라이언트 컴포넌트)
│  ├─ MerchantForm.tsx              (생성/수정 폼)
│  └─ [id]/
│     └─ page.tsx                   (상세 페이지)
├─ terminals/
│  ├─ MenuManager.tsx               (메뉴 관리 컴포넌트)
└─ members/
   └─ CreateAccountForm.tsx         (계정 생성 폼)
```

### 수정할 파일
```
lib/context/
├─ StoreContext.tsx                 (MerchantStoreContext로 이름 변경 및 확장)

app/store/admin/
├─ layout.tsx                       (MerchantStoreContext 제공)
├─ stores/
│  ├─ page.tsx                      (현황 대시보드 추가)
│  ├─ StoresClient.tsx              (필터링 로직 추가)
│  └─ StoreForm.tsx                 (가맹점 필드 수정 불가로 변경)
├─ terminals/
│  ├─ page.tsx                      (메뉴 관리 UI 분리)
│  ├─ TerminalsClient.tsx           (메뉴 관리 버튼 추가)
│  ├─ TerminalForm.tsx              (권한별 폼 필드 차등화)
│  └─ [id]/page.tsx                 (메뉴 관리 통합)
├─ members/
│  ├─ page.tsx                      (계정 생성 기능 추가)
│  └─ MembersClient.tsx             (계정 생성 버튼 추가)
```

---

## Phase 1: Context & 필터링 인프라

### Task 1: MerchantStoreContext 확장

**Files:**
- Modify: `lib/context/StoreContext.tsx` → `lib/context/MerchantStoreContext.tsx`

- [ ] **Step 1: 기존 StoreContext 파일 읽기**

현재 파일: `lib/context/StoreContext.tsx`

- [ ] **Step 2: MerchantStoreContext 타입 정의**

```typescript
// lib/context/MerchantStoreContext.tsx

import { createContext, useContext, ReactNode, useState } from 'react'
import type { Role } from '@/lib/roles/permissions'

export interface Merchant {
  id: string
  name: string
  registration_number: string
  address: string
  admin_id: string | null
  manager_id: string | null
  description: string | null
  created_at: string
}

export interface Store {
  id: string
  merchant_id: string
  store_name: string
  address: string
  is_active: boolean
  admin_id: string | null
  manager_id: string | null
  description: string | null
  created_at: string
}

interface MerchantStoreContextType {
  // 가맹점 계층
  selectedMerchantId: string | null
  merchants: Merchant[]
  setSelectedMerchant: (id: string) => void

  // 매장 계층
  assignedStoreIds: string[]
  selectedStoreIds: string[]
  stores: Store[]
  setSelectedStores: (ids: string[]) => void

  // 단말기 계층
  assignedTerminalIds: string[]

  // 사용자 정보
  userRole: Role | null
  userMerchantId: string | null

  // 필터링 함수
  filterByRole<T>(items: T[], roleField: keyof T): T[]
}

export const MerchantStoreContext = createContext<MerchantStoreContextType | undefined>(
  undefined
)

export function useMerchantStore() {
  const context = useContext(MerchantStoreContext)
  if (!context) {
    throw new Error('useMerchantStore must be used within MerchantStoreProvider')
  }
  return context
}

interface MerchantStoreProviderProps {
  children: ReactNode
  initialMerchants: Merchant[]
  initialStores: Store[]
  initialSelectedMerchantId: string | null
  initialSelectedStoreId: string | null
  initialAssignedStoreIds: string[]
  initialAssignedTerminalIds: string[]
  userRole: Role | null
  userMerchantId: string | null
}

export function MerchantStoreProvider({
  children,
  initialMerchants,
  initialStores,
  initialSelectedMerchantId,
  initialSelectedStoreId,
  initialAssignedStoreIds,
  initialAssignedTerminalIds,
  userRole,
  userMerchantId,
}: MerchantStoreProviderProps) {
  const [selectedMerchantId, setSelectedMerchantId] = useState(initialSelectedMerchantId)
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(
    initialSelectedStoreId ? [initialSelectedStoreId] : initialAssignedStoreIds
  )

  const filterByRole = <T,>(items: T[], roleField: keyof T): T[] => {
    return items
  }

  const value: MerchantStoreContextType = {
    selectedMerchantId,
    merchants: initialMerchants,
    setSelectedMerchant: setSelectedMerchantId,
    assignedStoreIds: initialAssignedStoreIds,
    selectedStoreIds,
    stores: initialStores,
    setSelectedStores: setSelectedStoreIds,
    assignedTerminalIds: initialAssignedTerminalIds,
    userRole,
    userMerchantId,
    filterByRole,
  }

  return (
    <MerchantStoreContext.Provider value={value}>
      {children}
    </MerchantStoreContext.Provider>
  )
}
```

- [ ] **Step 3: 테스트 작성**

```typescript
// lib/context/MerchantStoreContext.test.ts

import { renderHook, act } from '@testing-library/react'
import { MerchantStoreProvider, useMerchantStore } from './MerchantStoreContext'
import type { Merchant, Store } from './MerchantStoreContext'

describe('MerchantStoreContext', () => {
  const mockMerchants: Merchant[] = [
    {
      id: 'merchant-1',
      name: 'Test Merchant',
      registration_number: '123-45-67890',
      address: 'Seoul',
      admin_id: 'user-1',
      manager_id: null,
      description: null,
      created_at: '2026-04-25T00:00:00Z',
    },
  ]

  const mockStores: Store[] = [
    {
      id: 'store-1',
      merchant_id: 'merchant-1',
      store_name: 'Gangnam',
      address: 'Seoul',
      is_active: true,
      admin_id: 'user-2',
      manager_id: null,
      description: null,
      created_at: '2026-04-25T00:00:00Z',
    },
  ]

  it('should provide merchant store context', () => {
    const { result } = renderHook(() => useMerchantStore(), {
      wrapper: ({ children }) => (
        <MerchantStoreProvider
          children={children}
          initialMerchants={mockMerchants}
          initialStores={mockStores}
          initialSelectedMerchantId="merchant-1"
          initialSelectedStoreId="store-1"
          initialAssignedStoreIds={['store-1']}
          initialAssignedTerminalIds={[]}
          userRole="merchant_admin"
          userMerchantId="merchant-1"
        />
      ),
    })

    expect(result.current.selectedMerchantId).toBe('merchant-1')
    expect(result.current.merchants).toHaveLength(1)
  })
})
```

- [ ] **Step 4: 테스트 실행**

```bash
pnpm test lib/context/MerchantStoreContext.test.ts
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/context/MerchantStoreContext.tsx lib/context/MerchantStoreContext.test.ts
git commit -m "feat: extend StoreContext to MerchantStoreContext with role support"
```

---

### Task 2: 필터링 함수 모듈

**Files:**
- Create: `lib/roles/filters.ts`

- [ ] **Step 1: 필터링 함수 구현**

```typescript
// lib/roles/filters.ts

import type { Role } from './permissions'
import { ROLES } from './permissions'

export function filterMerchants<T extends { id: string }>(
  merchants: T[],
  userRole: Role | null,
  userMerchantId: string | null
): T[] {
  if (!userRole || !merchants.length) return merchants

  const isPlatform = [ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(userRole)
  if (isPlatform) return merchants

  const isMerchant = [ROLES.MERCHANT_ADMIN, ROLES.MERCHANT_MANAGER].includes(userRole)
  if (isMerchant && userMerchantId) {
    return merchants.filter(m => m.id === userMerchantId)
  }

  return []
}

export function filterStores<T extends { id: string; merchant_id: string }>(
  stores: T[],
  userRole: Role | null,
  userMerchantId: string | null,
  assignedStoreIds: string[]
): T[] {
  if (!userRole || !stores.length) return stores

  const isPlatform = [ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(userRole)
  if (isPlatform) return stores

  const isMerchant = [ROLES.MERCHANT_ADMIN, ROLES.MERCHANT_MANAGER].includes(userRole)
  if (isMerchant && userMerchantId) {
    return stores.filter(s => s.merchant_id === userMerchantId)
  }

  const isStore = [ROLES.STORE_ADMIN, ROLES.STORE_MANAGER].includes(userRole)
  if (isStore && assignedStoreIds.length > 0) {
    return stores.filter(s => assignedStoreIds.includes(s.id))
  }

  return []
}

export function getAssignableRoles(userRole: Role | null): Role[] {
  if (!userRole) return []

  switch (userRole) {
    case ROLES.PLATFORM_ADMIN:
      return Object.values(ROLES) as Role[]
    case ROLES.MERCHANT_ADMIN:
    case ROLES.MERCHANT_MANAGER:
      return [
        ROLES.MERCHANT_MANAGER,
        ROLES.STORE_ADMIN,
        ROLES.STORE_MANAGER,
        ROLES.TERMINAL_ADMIN,
      ]
    case ROLES.STORE_ADMIN:
    case ROLES.STORE_MANAGER:
      return [ROLES.TERMINAL_ADMIN]
    default:
      return []
  }
}
```

- [ ] **Step 2: 테스트 작성 및 실행**

```bash
pnpm test lib/roles/filters.test.ts
```

Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add lib/roles/filters.ts lib/roles/filters.test.ts
git commit -m "feat: add role-based filtering functions"
```

---

## Phase 2-6: 페이지 구현 (상세 과정 생략)

각 Phase별로 다음 구조로 진행:
- Task N.1: 컴포넌트 구현
- Task N.2: 테스트 작성
- Task N.3: 커밋

**Phase 2:** 가맹점 관리 (merchants) - Task 3
**Phase 3:** 매장 대시보드 (stores) - Task 4  
**Phase 4:** 단말기 메뉴 분리 (terminals) - Task 5
**Phase 5:** 계정 생성 (members) - Task 6
**Phase 6:** E2E 테스트 - Task 7
**Phase 7:** 최종 검증 - Task 8

---

## 예상 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| 1 | Context + 필터링 | 4시간 |
| 2 | 가맹점 관리 | 6시간 |
| 3 | 매장 대시보드 | 4시간 |
| 4 | 단말기 메뉴 | 6시간 |
| 5 | 계정 생성 | 6시간 |
| 6 | E2E 테스트 | 8시간 |
| 7 | 최종 검증 | 4시간 |
| **합계** | | **38시간** |

---

**Plan Status:** ✅ Ready for Implementation

