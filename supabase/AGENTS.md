<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# supabase (Database Layer)

## Purpose
Supabase 데이터베이스 스키마, 마이그레이션, 시드 데이터를 관리합니다.
PostgreSQL 기반이며 RLS(Row Level Security) 정책과 함께 운영됩니다.

## Key Files

| File | Description |
|------|-------------|
| `schema.sql` | 전체 DB 스키마 정의 |
| `seed.sql` | 개발/테스트용 초기 데이터 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `migrations/` | 순차적 DB 마이그레이션 파일 |

## Migration Files

| File | Description |
|------|-------------|
| `migrations/20260320000001_add_transaction_columns.sql` | 거래 테이블 컬럼 추가 |
| `migrations/20260320000002_add_offline_detection.sql` | 오프라인 감지 기능 추가 |
| `migrations/20260323000001_merchant_terminal_key.sql` | 가맹점-단말기 키 테이블 |
| `migrations/20260324000001_add_merchants_contact_email.sql` | 가맹점 연락처 이메일 추가 |
| `migrations/anomaly_alerts.sql` | 이상 감지 알림 테이블 |

## For AI Agents

### Working In This Directory
- **새 마이그레이션**: 타임스탬프 기반 파일명 사용 (`YYYYMMDDHHMMSS_description.sql`)
- **스키마 변경 후**: `types/supabase.ts` 재생성 필요
  ```bash
  supabase gen types typescript --local > types/supabase.ts
  ```
- **RLS 정책**: 모든 테이블에 적절한 RLS 정책 적용 필수
- **절대 금지**: 기존 마이그레이션 파일 수정 (새 마이그레이션으로 변경)

### Common SQL Patterns
```sql
-- 마이그레이션 파일 헤더 패턴
-- Migration: {description}
-- Created: {date}

-- 테이블 생성 패턴
CREATE TABLE IF NOT EXISTS public.{table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;
```

### Testing Requirements
- 마이그레이션 적용: `supabase db push` (로컬) 또는 Supabase 대시보드
- 데이터 확인: Supabase Studio 또는 psql

## Dependencies

### External
- Supabase CLI - 마이그레이션 관리 및 타입 생성

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
