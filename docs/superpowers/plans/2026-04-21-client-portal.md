# 고객사 포털 (/client/admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고객사 관리자가 사원을 등록하고 식수 이력을 조회하며 정산서를 생성·Excel 다운로드하는 `/client/admin` 포털을 구축한다.

**Architecture:** Supabase Auth + `client_users` 테이블로 인증한다. `/api/client/*` 서버사이드 API가 RLS를 통해 본인 client 데이터만 노출한다. 기존 `/dashboard/employees`, `/dashboard/settlements`는 `/client/admin`으로 이동 후 대시보드 NavItem에서 제거한다.

**Tech Stack:** Next.js 16, Supabase SSR (`@supabase/ssr`), TypeScript, Tailwind CSS, `xlsx`

**선행 조건:** `2026-04-21-db-admin-hierarchy.md` 계획 완료 — `clients`, `client_users`, `employees`, `meal_usages`, `settlements`, `settlement_items` 테이블이 `client_id` 기반으로 존재해야 한다.

---

## 파일 구조

| 파일 | 작업 |
|---|---|
| `app/client/admin/layout.tsx` | 신규 — Auth guard (client_users) + 사이드바 |
| `app/client/admin/page.tsx` | 신규 — 대시보드 (오늘 태깅 수, 활성 사원 수) |
| `app/api/client/employees/route.ts` | 신규 — GET(목록) + POST(CSV 업로드) |
| `app/api/client/employees/[id]/route.ts` | 신규 — PATCH(활성/비활성) |
| `app/client/admin/employees/page.tsx` | 신규 — 사원 관리 UI |
| `app/api/client/usages/route.ts` | 신규 — GET(이력 조회) |
| `app/client/admin/usages/page.tsx` | 신규 — 식수 이력 UI |
| `app/api/client/settlements/route.ts` | 신규 — GET(목록) + POST(생성) |
| `app/api/client/settlements/[id]/route.ts` | 신규 — GET(상세+Excel) + PATCH(확정) |
| `app/client/admin/settlements/page.tsx` | 신규 — 정산 UI |
| `app/dashboard/NavItem.tsx` | 수정 — employees/settlements 메뉴 제거 |

---

### Task 1: /client/admin 레이아웃 (Auth guard)

**Files:**
- Create: `app/client/admin/layout.tsx`

- [ ] **Step 1: 레이아웃 파일 작성**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut } from 'lucide-react'

const NAV = [
  { href: '/client/admin',             label: '대시보드' },
  { href: '/client/admin/employees',   label: '사원 관리' },
  { href: '/client/admin/usages',      label: '식수 이력' },
  { href: '/client/admin/settlements', label: '정산' },
]

export default async function ClientAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('client_users')
    .select('client_id, role, clients(client_name)')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')

  const clientName = (membership.clients as { client_name: string } | null)?.client_name

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--pos-bg-gradient)' }}>
      <aside
        className="hidden md:flex flex-col md:w-16 lg:w-56 flex-shrink-0"
        style={{ background: 'var(--bp-surface)', borderRight: '1px solid var(--bp-border)' }}
      >
        <div className="px-3 py-4" style={{ borderBottom: '1px solid var(--bp-border)' }}>
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#06D6A0' }}>
              <span className="text-black font-black text-xs leading-none">C</span>
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-sm font-bold text-white leading-none">고객사 포털</p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--bp-text-3)' }}>
                {clientName ?? user.email}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/signout" method="post" className="px-2 py-3"
          style={{ borderTop: '1px solid var(--bp-border)' }}>
          <button type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">로그아웃</span>
          </button>
        </form>
      </aside>
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "client/admin/layout" | head -10
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add app/client/admin/layout.tsx
git commit -m "feat: add /client/admin layout with client_users auth guard"
```

---

### Task 2: /client/admin 대시보드

**Files:**
- Create: `app/client/admin/page.tsx`

- [ ] **Step 1: 대시보드 페이지 작성**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientAdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cu } = await supabase
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()
  if (!cu) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ count: todayCount }, { count: employeeCount }] = await Promise.all([
    supabase
      .from('meal_usages')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', cu.client_id)
      .gte('used_at', today),
    supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', cu.client_id)
      .eq('is_active', true),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">식수 현황</h1>
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="p-4 bg-gray-800 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">오늘 태깅 수</p>
          <p className="text-3xl font-bold">{(todayCount ?? 0).toLocaleString()}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">활성 사원 수</p>
          <p className="text-3xl font-bold">{(employeeCount ?? 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "client/admin/page" | head -10
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add app/client/admin/page.tsx
git commit -m "feat: add /client/admin dashboard (today usage count, active employees)"
```

---

### Task 3: /api/client/employees API

**Files:**
- Create: `app/api/client/employees/route.ts`
- Create: `app/api/client/employees/[id]/route.ts`

- [ ] **Step 1: 목록 조회 + 일괄 업로드 API 작성**

```typescript
// app/api/client/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getClientId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()
  return data?.client_id ?? null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const q = searchParams.get('q') ?? ''
  const from = (page - 1) * limit

  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId)
    .order('employee_no')
    .range(from, from + limit - 1)

  if (q) {
    query = query.or(`name.ilike.%${q}%,employee_no.ilike.%${q}%,department.ilike.%${q}%`)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await req.json() as Array<{
    employee_no: string
    name: string
    department?: string
    card_number?: string
    barcode?: string
  }>

  const inserts = rows.map(r => ({ ...r, client_id: clientId }))
  const { data, error } = await supabase
    .from('employees')
    .upsert(inserts, { onConflict: 'client_id,employee_no' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ count: data?.length ?? 0 })
}
```

- [ ] **Step 2: 개별 수정 API 작성**

```typescript
// app/api/client/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { is_active?: boolean }

  const { error } = await supabase
    .from('employees')
    .update(body)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "api/client/employees" | head -10
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add app/api/client/employees/route.ts app/api/client/employees/[id]/route.ts
git commit -m "feat: add /api/client/employees (GET list, POST upsert, PATCH toggle)"
```

---

### Task 4: /client/admin/employees 페이지

**Files:**
- Create: `app/client/admin/employees/page.tsx`

- [ ] **Step 1: 페이지 파일 작성**

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'
import type { Employee } from '@/types/menu'

export default function ClientEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchEmployees = async (p = page, query = q) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client/employees?page=${p}&limit=50&q=${encodeURIComponent(query)}`)
      const json = await res.json()
      setEmployees(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchEmployees(1, q)
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').slice(1)
    const rows = lines.map(line => {
      const [employee_no, name, department, card_number, barcode] =
        line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      return {
        employee_no, name,
        department: department || undefined,
        card_number: card_number || undefined,
        barcode: barcode || undefined,
      }
    }).filter(r => r.employee_no && r.name)

    const res = await fetch('/api/client/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    if (res.ok) {
      const json = await res.json()
      alert(`${json.count}명 업로드 완료`)
      fetchEmployees()
    } else {
      const err = await res.json()
      alert(`업로드 실패: ${err.error ?? '알 수 없는 오류'}`)
    }
    e.target.value = ''
  }

  const handleToggleActive = async (emp: Employee) => {
    await fetch(`/api/client/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !emp.is_active }),
    })
    fetchEmployees()
  }

  const handleCsvDownload = () => {
    const header = 'employee_no,name,department,card_number,barcode\n'
    const rows = employees.map(e =>
      [e.employee_no, e.name, e.department ?? '', e.card_number ?? '', e.barcode ?? ''].join(',')
    ).join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'employees.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">사원 관리</h1>
        <div className="flex gap-2">
          <button onClick={handleCsvDownload}
            className="px-4 py-2 text-sm bg-gray-700 rounded hover:bg-gray-600 transition-colors">
            CSV 다운로드
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-500 transition-colors">
            CSV 업로드
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </div>
      </div>
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="이름, 사원번호, 부서 검색..."
          className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-600 text-white placeholder-gray-500" />
        <button type="submit"
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors">
          검색
        </button>
      </form>
      {loading ? (
        <div className="text-gray-400 py-8 text-center">로딩 중...</div>
      ) : employees.length === 0 ? (
        <div className="text-gray-500 py-8 text-center">등록된 사원이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="py-2 px-3">사원번호</th>
                <th className="py-2 px-3">이름</th>
                <th className="py-2 px-3">부서</th>
                <th className="py-2 px-3">카드번호</th>
                <th className="py-2 px-3">바코드</th>
                <th className="py-2 px-3">상태</th>
                <th className="py-2 px-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2 px-3 font-mono">{emp.employee_no}</td>
                  <td className="py-2 px-3 font-medium">{emp.name}</td>
                  <td className="py-2 px-3 text-gray-400">{emp.department ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-400 font-mono text-xs">{emp.card_number ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-400 font-mono text-xs">{emp.barcode ?? '-'}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      emp.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
                    }`}>{emp.is_active ? '활성' : '비활성'}</span>
                  </td>
                  <td className="py-2 px-3">
                    <button onClick={() => handleToggleActive(emp)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline">
                      {emp.is_active ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
        <span>총 {total}명</span>
        <div className="flex gap-2">
          {page > 1 && (
            <button onClick={() => setPage(p => p - 1)} className="hover:text-white">← 이전</button>
          )}
          <span>페이지 {page}</span>
          {employees.length === 50 && (
            <button onClick={() => setPage(p => p + 1)} className="hover:text-white">다음 →</button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "client/admin/employees" | head -10
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add app/client/admin/employees/page.tsx
git commit -m "feat: add /client/admin/employees page"
```

---

### Task 5: /api/client/usages + usages 페이지

**Files:**
- Create: `app/api/client/usages/route.ts`
- Create: `app/client/admin/usages/page.tsx`

- [ ] **Step 1: usages API 작성**

```typescript
// app/api/client/usages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cu } = await supabase
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ??
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const to = searchParams.get('to') ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('meal_usages')
    .select('id, meal_type, used_at, amount, employees(employee_no, name, department)')
    .eq('client_id', cu.client_id)
    .gte('used_at', from)
    .lte('used_at', to + 'T23:59:59')
    .order('used_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 2: usages 페이지 작성**

```typescript
// app/client/admin/usages/page.tsx
'use client'
import { useEffect, useState } from 'react'

interface UsageRow {
  id: string
  meal_type: string
  used_at: string
  amount: number
  employees: { employee_no: string; name: string; department?: string } | null
}

const MEAL_LABEL: Record<string, string> = {
  breakfast: '조식', lunch: '중식', dinner: '석식',
}

export default function ClientUsagesPage() {
  const [usages, setUsages] = useState<UsageRow[]>([])
  const [from, setFrom] = useState(
    () => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  )
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const fetchUsages = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client/usages?from=${from}&to=${to}`)
      const json = await res.json()
      setUsages(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsages() }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">식수 이력</h1>
      <div className="flex gap-2 mb-4 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">시작일</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-2 py-1.5 bg-gray-800 rounded border border-gray-600 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">종료일</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-2 py-1.5 bg-gray-800 rounded border border-gray-600 text-sm" />
        </div>
        <button onClick={fetchUsages}
          className="px-4 py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-500 transition-colors">
          조회
        </button>
      </div>
      {loading ? (
        <div className="text-gray-400 py-8 text-center">로딩 중...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="py-2 px-3">일시</th>
                <th className="py-2 px-3">사원번호</th>
                <th className="py-2 px-3">이름</th>
                <th className="py-2 px-3">부서</th>
                <th className="py-2 px-3">끼니</th>
              </tr>
            </thead>
            <tbody>
              {usages.map(u => (
                <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="py-2 px-3 font-mono text-xs">
                    {new Date(u.used_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="py-2 px-3 font-mono">{u.employees?.employee_no ?? '-'}</td>
                  <td className="py-2 px-3 font-medium">{u.employees?.name ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-400">{u.employees?.department ?? '-'}</td>
                  <td className="py-2 px-3">{MEAL_LABEL[u.meal_type] ?? u.meal_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {usages.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">이력이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "client/usages\|client/admin/usages" | head -10
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add app/api/client/usages/route.ts app/client/admin/usages/page.tsx
git commit -m "feat: add /api/client/usages and /client/admin/usages page"
```

---

### Task 6: /api/client/settlements + settlements 페이지

**Files:**
- Create: `app/api/client/settlements/route.ts`
- Create: `app/api/client/settlements/[id]/route.ts`
- Create: `app/client/admin/settlements/page.tsx`

- [ ] **Step 1: 정산 목록/생성 API 작성**

```typescript
// app/api/client/settlements/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getClientId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('client_users').select('client_id').eq('user_id', user.id).single()
  return data?.client_id ?? null
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const clientId = await getClientId(supabase)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { period_start, period_end } = await req.json() as {
    period_start: string
    period_end: string
  }

  const { data: usages } = await supabase
    .from('meal_usages')
    .select('employee_id, meal_type, amount')
    .eq('client_id', clientId)
    .gte('used_at', period_start)
    .lte('used_at', period_end + 'T23:59:59')

  const rows = usages ?? []
  const total_count = rows.length
  const total_amount = rows.reduce((s, u) => s + u.amount, 0)

  const { data: settlement, error: sErr } = await supabase
    .from('settlements')
    .insert({ client_id: clientId, period_start, period_end, total_count, total_amount })
    .select()
    .single()

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  type EmpAgg = {
    breakfast_count: number; lunch_count: number; dinner_count: number
    total_amount: number; usage_count: number
  }
  const empMap = new Map<string, EmpAgg>()
  for (const u of rows) {
    const cur = empMap.get(u.employee_id) ??
      { breakfast_count: 0, lunch_count: 0, dinner_count: 0, total_amount: 0, usage_count: 0 }
    const key = `${u.meal_type}_count` as keyof EmpAgg
    ;(cur[key] as number)++
    cur.total_amount += u.amount
    cur.usage_count++
    empMap.set(u.employee_id, cur)
  }

  const empIds = [...empMap.keys()]
  if (empIds.length > 0) {
    const { data: emps } = await supabase
      .from('employees')
      .select('id, employee_no, name, department')
      .in('id', empIds)

    const items = (emps ?? []).map(e => ({
      settlement_id: settlement.id,
      employee_id: e.id,
      employee_no: e.employee_no,
      employee_name: e.name,
      department: e.department,
      ...empMap.get(e.id),
    }))
    await supabase.from('settlement_items').insert(items)
  }

  return NextResponse.json({ data: settlement })
}
```

- [ ] **Step 2: 정산 상세/확정/Excel API 작성**

```typescript
// app/api/client/settlements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const format = new URL(req.url).searchParams.get('format')

  const { data: settlement } = await supabase
    .from('settlements').select('*').eq('id', id).single()
  if (!settlement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: items } = await supabase
    .from('settlement_items').select('*').eq('settlement_id', id).order('employee_no')

  if (format === 'excel') {
    const { utils, write } = await import('xlsx')
    const sheetRows = (items ?? []).map(i => ({
      사원번호: i.employee_no,
      이름: i.employee_name,
      부서: i.department ?? '',
      조식: i.breakfast_count,
      중식: i.lunch_count,
      석식: i.dinner_count,
      합계: i.usage_count,
      금액: i.total_amount,
    }))
    const ws = utils.json_to_sheet(sheetRows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '정산')
    const buf = write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="settlement-${id}.xlsx"`,
      },
    })
  }

  return NextResponse.json({ data: settlement, items: items ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const { status } = await req.json() as { status: string }

  if (status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed is allowed' }, { status: 400 })
  }

  const { error } = await supabase
    .from('settlements')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: settlements 페이지 작성**

```typescript
// app/client/admin/settlements/page.tsx
'use client'
import { useEffect, useState } from 'react'
import type { Settlement, SettlementItem } from '@/types/menu'

export default function ClientSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selected, setSelected] = useState<{ settlement: Settlement; items: SettlementItem[] } | null>(null)
  const [creating, setCreating] = useState(false)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const fetchSettlements = async () => {
    const res = await fetch('/api/client/settlements')
    if (!res.ok) return
    const json = await res.json()
    setSettlements(json.data ?? [])
  }

  useEffect(() => { fetchSettlements() }, [])

  const handleCreate = async () => {
    if (!periodStart || !periodEnd) { alert('기간을 선택해주세요.'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/client/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
      })
      if (res.ok) await fetchSettlements()
      else alert('정산 생성 실패')
    } finally { setCreating(false) }
  }

  const handleSelect = async (s: Settlement) => {
    const res = await fetch(`/api/client/settlements/${s.id}`)
    if (!res.ok) return
    const json = await res.json()
    setSelected({ settlement: json.data, items: json.items ?? [] })
  }

  const handleConfirm = async (id: string) => {
    if (!confirm('정산을 확정하시겠습니까? 이후 수정이 불가합니다.')) return
    const res = await fetch(`/api/client/settlements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    if (res.ok) {
      await fetchSettlements()
      if (selected?.settlement.id === id) {
        await handleSelect({ ...selected.settlement, status: 'confirmed' })
      }
    }
  }

  return (
    <div className="p-6 flex gap-6 h-full overflow-hidden">
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
        <h1 className="text-xl font-bold mb-4">식수 정산</h1>
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
          <p className="text-sm text-gray-400 mb-2 font-medium">새 정산 생성</p>
          <label className="block text-xs text-gray-500 mb-1">시작일</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 bg-gray-700 rounded text-sm border border-gray-600" />
          <label className="block text-xs text-gray-500 mb-1">종료일</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 bg-gray-700 rounded text-sm border border-gray-600" />
          <button onClick={handleCreate} disabled={creating}
            className="w-full py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-500 disabled:opacity-50">
            {creating ? '생성 중...' : '정산 생성'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {settlements.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">정산 내역이 없습니다.</p>
          ) : settlements.map(s => (
            <button key={s.id} onClick={() => handleSelect(s)}
              className={`w-full text-left p-3 rounded border transition-colors ${
                selected?.settlement.id === s.id
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
              }`}>
              <p className="text-sm font-medium">{s.period_start} ~ {s.period_end}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {s.total_count.toLocaleString()}건 · {s.total_amount.toLocaleString()}원
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                s.status === 'confirmed'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-yellow-900 text-yellow-300'
              }`}>{s.status === 'confirmed' ? '확정' : '초안'}</span>
            </button>
          ))}
        </div>
      </div>
      {selected ? (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {selected.settlement.period_start} ~ {selected.settlement.period_end}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/api/client/settlements/${selected.settlement.id}?format=excel`, '_blank')}
                className="px-3 py-1.5 text-sm bg-green-700 rounded hover:bg-green-600">
                Excel
              </button>
              {selected.settlement.status === 'draft' && (
                <button onClick={() => handleConfirm(selected.settlement.id)}
                  className="px-3 py-1.5 text-sm bg-blue-600 rounded hover:bg-blue-500">
                  정산 확정
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-left">
                  <th className="py-2 px-3">사원번호</th><th className="py-2 px-3">이름</th>
                  <th className="py-2 px-3">부서</th>
                  <th className="py-2 px-3 text-right">조식</th><th className="py-2 px-3 text-right">중식</th>
                  <th className="py-2 px-3 text-right">석식</th><th className="py-2 px-3 text-right">합계</th>
                  <th className="py-2 px-3 text-right">금액(원)</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map(item => (
                  <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-2 px-3 font-mono text-sm">{item.employee_no}</td>
                    <td className="py-2 px-3 font-medium">{item.employee_name}</td>
                    <td className="py-2 px-3 text-gray-400">{item.department ?? '-'}</td>
                    <td className="py-2 px-3 text-right">{item.breakfast_count}</td>
                    <td className="py-2 px-3 text-right">{item.lunch_count}</td>
                    <td className="py-2 px-3 text-right">{item.dinner_count}</td>
                    <td className="py-2 px-3 text-right font-semibold">{item.usage_count}</td>
                    <td className="py-2 px-3 text-right">{item.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>정산을 선택하면 상세 내역을 볼 수 있습니다.</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "client/settlements" | head -10
```

Expected: 오류 없음

- [ ] **Step 5: Commit**

```bash
git add app/api/client/settlements/route.ts app/api/client/settlements/[id]/route.ts app/client/admin/settlements/page.tsx
git commit -m "feat: add /api/client/settlements and /client/admin/settlements page with Excel export"
```

---

### Task 7: dashboard NavItem 정리

**Files:**
- Modify: `app/dashboard/NavItem.tsx:5-16,26-36`

`/dashboard/employees`와 `/dashboard/settlements`가 `/client/admin`으로 이동했으므로 NavItem에서 제거한다.

- [ ] **Step 1: NAV_ITEMS에서 employees, settlements 제거 + 미사용 import 정리**

`app/dashboard/NavItem.tsx` 수정:

```typescript
// 변경 전 import
import {
  LayoutDashboard, Monitor, KeyRound, Receipt, BarChart3,
  Bell, Settings2, Users, ClipboardList,
  type LucideIcon,
} from 'lucide-react'

// 변경 후 import (Users, ClipboardList 제거)
import {
  LayoutDashboard, Monitor, KeyRound, Receipt, BarChart3,
  Bell, Settings2,
  type LucideIcon,
} from 'lucide-react'
```

```typescript
// 변경 전 NAV_ITEMS (9개)
const NAV_ITEMS: NavEntry[] = [
  { href: '/dashboard',              label: '대시보드',   mobileLabel: '대시보드', icon: LayoutDashboard },
  { href: '/dashboard/terminals',    label: '단말기 관리', mobileLabel: '단말기',   icon: Monitor },
  { href: '/dashboard/keys',         label: '키 관리',    mobileLabel: '키 관리',  icon: KeyRound },
  { href: '/dashboard/transactions', label: '거래내역',   mobileLabel: '거래내역', icon: Receipt },
  { href: '/dashboard/analytics',    label: '매출 분석',  mobileLabel: '매출분석', icon: BarChart3 },
  { href: '/dashboard/alerts',       label: '이상 알림',  mobileLabel: '알림',     icon: Bell, alertKey: true },
  { href: '/dashboard/settings',     label: '설정',       mobileLabel: '설정',     icon: Settings2 },
  { href: '/dashboard/employees',    label: '사원 관리',   mobileLabel: '사원',     icon: Users },
  { href: '/dashboard/settlements',  label: '식수 정산',   mobileLabel: '식수정산', icon: ClipboardList },
]

// 변경 후 NAV_ITEMS (7개, employees/settlements 제거)
const NAV_ITEMS: NavEntry[] = [
  { href: '/dashboard',              label: '대시보드',   mobileLabel: '대시보드', icon: LayoutDashboard },
  { href: '/dashboard/terminals',    label: '단말기 관리', mobileLabel: '단말기',   icon: Monitor },
  { href: '/dashboard/keys',         label: '키 관리',    mobileLabel: '키 관리',  icon: KeyRound },
  { href: '/dashboard/transactions', label: '거래내역',   mobileLabel: '거래내역', icon: Receipt },
  { href: '/dashboard/analytics',    label: '매출 분석',  mobileLabel: '매출분석', icon: BarChart3 },
  { href: '/dashboard/alerts',       label: '이상 알림',  mobileLabel: '알림',     icon: Bell, alertKey: true },
  { href: '/dashboard/settings',     label: '설정',       mobileLabel: '설정',     icon: Settings2 },
]
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "NavItem" | head -5
```

Expected: 오류 없음

- [ ] **Step 3: Next.js 빌드 확인**

```bash
npx next build 2>&1 | tail -15
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/NavItem.tsx
git commit -m "feat: remove employees/settlements from dashboard nav (moved to /client/admin)"
```
