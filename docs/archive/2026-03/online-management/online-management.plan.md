# [Plan] online-management

## 개요
**Feature**: 온라인 단말기 관리 시스템
**Stack**: Vercel (Next.js) + Supabase (PostgreSQL + Auth + Realtime)
**목표**: 증가하는 단말기를 원격으로 등록·설정·모니터링할 수 있는 중앙 관리 플랫폼 구축

---

## 배경 및 문제 정의

### 현재 상태 (AS-IS)
- 단말기 설정이 localStorage에만 저장됨 (단말기 교체 시 재설정 필요)
- 거래내역이 로컬 IndexedDB에 저장됨 (단말기별 분산)
- 메뉴/가격 변경 시 각 단말기에 수동 접속 필요
- 단말기 운영 현황 파악 불가

### 목표 상태 (TO-BE)
- 가맹점 관리자가 웹에서 전체 단말기 현황 조회
- 서버에서 메뉴/설정 변경 → 단말기 자동 반영
- 모든 거래내역이 중앙 DB에 저장
- 단말기 원격 등록 및 인증 토큰 발급

---

## 핵심 기능 요구사항

### F-01. 가맹점 계정 관리
- 가맹점 가입/로그인 (이메일 + 비밀번호)
- 슈퍼 관리자 / 가맹점 관리자 / 단말기 권한 구분
- Supabase Auth 활용

### F-02. 단말기 등록 및 인증
- 단말기 고유 ID 발급 (UUID)
- 단말기 활성화 코드로 가맹점에 연결
- 단말기 JWT 토큰으로 API 인증

### F-03. 원격 설정 배포
- 서버에서 메뉴, 가격, 시간대 설정
- 단말기 폴링 또는 Supabase Realtime으로 설정 수신
- 설정 변경 이력 관리

### F-04. 중앙 거래내역 저장
- 결제 성공/실패 시 Supabase DB에 저장
- 오프라인 결제는 로컬 저장 후 온라인 복귀 시 동기화
- 가맹점별, 단말기별 조회 가능

### F-05. 관리 대시보드
- 실시간 단말기 접속 현황 (온라인/오프라인)
- 오늘 매출 현황 (메뉴별, 단말기별)
- 이상 거래 알림

---

## 기술 스택

```
[Vercel]
  └── Next.js App (현재 앱 그대로 + 서버 API 확장)
      ├── /app/api/device/register  — 단말기 등록
      ├── /app/api/device/config    — 설정 조회 (단말기 → 서버)
      ├── /app/api/transactions     — 거래 저장/조회
      └── /app/dashboard/           — 관리 대시보드 (NEW)

[Supabase]
  ├── Auth      — 가맹점 계정
  ├── Database  — PostgreSQL
  │   ├── merchants       (가맹점)
  │   ├── terminals       (단말기)
  │   ├── terminal_configs (설정 스냅샷)
  │   ├── menus           (메뉴)
  │   └── transactions    (거래내역)
  └── Realtime  — 설정 변경 푸시
```

---

## DB 스키마 (초안)

### merchants (가맹점)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| name | text | 가맹점명 |
| biz_no | text | 사업자번호 |
| merchant_id | text | PG 가맹점 코드 |
| created_at | timestamptz | |

### terminals (단말기)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | 단말기 UUID |
| merchant_id | uuid FK | 가맹점 |
| term_id | text | 2자리 단말기 ID |
| name | text | 단말기 이름 |
| corner | text | 코너명 |
| status | text | online/offline |
| last_seen_at | timestamptz | 마지막 접속 |
| created_at | timestamptz | |

### terminal_configs (단말기 설정)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| terminal_id | uuid FK | |
| config | jsonb | 전체 설정 JSON |
| version | int | 설정 버전 |
| created_at | timestamptz | |

### transactions (거래내역)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| terminal_id | uuid FK | |
| merchant_id | uuid FK | |
| merchant_order_id | text | 주문번호 |
| menu_name | text | |
| amount | int | |
| barcode_info | text | 사용 바코드/QR |
| payment_type | text | qr/barcode/rfcard |
| status | text | success/cancelled |
| approved_at | timestamptz | |
| synced | bool | 오프라인 동기화 여부 |

---

## 단말기 인증 플로우

```
최초 설치:
  단말기 → POST /api/device/activate {activationCode}
         ← {terminalId, accessToken}

이후 API 호출:
  단말기 → Authorization: Bearer {accessToken}

설정 동기화:
  단말기 → GET /api/device/config (폴링 30초 or Realtime)
         ← {version, config} 변경된 경우에만 업데이트
```

---

## 구현 우선순위

| 순서 | 항목 | 중요도 |
|------|------|--------|
| 1 | Supabase 프로젝트 설정 + DB 스키마 | 필수 |
| 2 | 단말기 인증 API (register/activate) | 필수 |
| 3 | 거래내역 서버 저장 | 필수 |
| 4 | 원격 설정 조회 API | 필수 |
| 5 | 관리 대시보드 기본 | 높음 |
| 6 | Realtime 설정 푸시 | 중간 |
| 7 | 오프라인 동기화 개선 | 중간 |
| 8 | 이상 거래 알림 | 낮음 |

---

## 예상 작업 범위

- Supabase 설정: 0.5일
- API 라우트 구현: 2일
- 단말기 앱 수정 (설정 동기화 + 서버 저장): 1.5일
- 관리 대시보드: 2일
- 테스트 및 검증: 1일

**총계**: 약 7일

---

## 성공 기준
- [ ] 단말기 원격 등록 가능
- [ ] 서버 설정 변경 → 1분 내 단말기 반영
- [ ] 모든 거래내역 Supabase에 저장
- [ ] 관리자 화면에서 전체 단말기 현황 조회
- [ ] 단말기 10대 이상 동시 운영 검증
