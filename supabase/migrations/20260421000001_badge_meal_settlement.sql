-- ============================================================
-- Migration 20260421000001: 사원증 식수 기록 + 정산 기능
-- - terminals.input_policy 컬럼 추가
-- - merchants.badge_settings 컬럼 추가
-- - employees 테이블 생성
-- - meal_usages 테이블 생성
-- - settlements 테이블 생성
-- - settlement_items 테이블 생성
-- - RLS 정책 추가
-- - pg_cron 자동 정산 스케줄 (선택적)
-- ============================================================

-- ============================================================
-- 1. 기존 테이블 컬럼 추가
-- ============================================================

-- terminals 테이블에 input_policy 컬럼 추가
ALTER TABLE terminals
  ADD COLUMN IF NOT EXISTS input_policy jsonb NOT NULL DEFAULT
    '{"barcode":"bizplay_payment","qr":"bizplay_payment","rfcard":"bizplay_payment"}';

-- merchants 테이블에 badge_settings 컬럼 추가
-- dup_policy: "block" | "allow" | "warn"
-- settle_day: 1~28
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS badge_settings jsonb NOT NULL DEFAULT
    '{"dup_policy":"block","settle_day":25}';

-- ============================================================
-- 2. 신규 테이블 생성
-- ============================================================

-- employees: 고객사별 사원 정보
-- card_number, barcode: NULL 허용, 존재 시 merchant 내 유일 (partial unique index)
CREATE TABLE IF NOT EXISTS employees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id),
  employee_no   text NOT NULL,
  name          text NOT NULL,
  department    text,
  card_number   text,
  barcode       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, employee_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS employees_merchant_card_unique
  ON employees (merchant_id, card_number) WHERE card_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_merchant_barcode_unique
  ON employees (merchant_id, barcode) WHERE barcode IS NOT NULL;

-- meal_usages: 식수 사용내역
CREATE TABLE IF NOT EXISTS meal_usages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id),
  terminal_id   uuid NOT NULL REFERENCES terminals(id),
  employee_id   uuid NOT NULL REFERENCES employees(id),
  meal_type     text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  used_at       timestamptz NOT NULL DEFAULT now(),
  amount        integer NOT NULL DEFAULT 0,
  menu_id       text,
  synced        boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS meal_usages_employee_used ON meal_usages (employee_id, used_at);
CREATE INDEX IF NOT EXISTS meal_usages_merchant_used ON meal_usages (merchant_id, used_at);

-- settlements: 정산 헤더
CREATE TABLE IF NOT EXISTS settlements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  total_count   integer NOT NULL DEFAULT 0,
  total_amount  integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at  timestamptz
);

-- settlement_items: 사원별 집계
CREATE TABLE IF NOT EXISTS settlement_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES employees(id),
  employee_no     text NOT NULL,
  employee_name   text NOT NULL,
  department      text,
  usage_count     integer NOT NULL DEFAULT 0,
  total_amount    integer NOT NULL DEFAULT 0,
  breakfast_count integer NOT NULL DEFAULT 0,
  lunch_count     integer NOT NULL DEFAULT 0,
  dinner_count    integer NOT NULL DEFAULT 0
);

-- ============================================================
-- 3. RLS 정책 추가
-- ============================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

-- employees: 가맹점 관리자만 접근
CREATE POLICY "merchants manage own employees"
  ON employees FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );

-- meal_usages: 가맹점 관리자만 접근
CREATE POLICY "merchants manage own meal_usages"
  ON meal_usages FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );

-- settlements: 가맹점 관리자만 접근
CREATE POLICY "merchants manage own settlements"
  ON settlements FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );

-- settlement_items: 정산 헤더를 통해 가맹점 관리자만 접근
CREATE POLICY "merchants manage own settlement_items"
  ON settlement_items FOR ALL
  USING (
    settlement_id IN (
      SELECT id FROM settlements
      WHERE merchant_id IN (
        SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 4. pg_cron 자동 정산 (선택적 — cron 확장이 있을 때만)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'auto-settlement',
      '5 0 * * *',
      $cron$
        SELECT 1; -- 실제 정산 로직은 애플리케이션에서 처리
      $cron$
    );
  END IF;
END;
$$;
