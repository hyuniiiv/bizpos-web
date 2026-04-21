-- ============================================================
-- BIZPOS Online Management — Supabase Schema
-- Supabase Dashboard > SQL Editor에서 실행
-- ============================================================

-- 1. merchants (가맹점)
CREATE TABLE IF NOT EXISTS merchants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  biz_no        text UNIQUE,
  merchant_id   text,
  contact_email text,
  created_at    timestamptz DEFAULT now()
);

-- 2. merchant_users (가맹점 ↔ auth.users 연결)
CREATE TABLE IF NOT EXISTS merchant_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'admin',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (merchant_id, user_id)
);

-- 3. terminals (단말기)
CREATE TABLE IF NOT EXISTS terminals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  term_id         text NOT NULL,
  name            text NOT NULL DEFAULT '',
  corner          text NOT NULL DEFAULT '',
  activation_code text UNIQUE,
  access_token    text,
  status          text NOT NULL DEFAULT 'offline',
  last_seen_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (merchant_id, term_id)
);

-- 4. terminal_configs (단말기 설정 이력)
CREATE TABLE IF NOT EXISTS terminal_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  config      jsonb NOT NULL,
  version     int NOT NULL DEFAULT 1,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terminal_configs_tid_ver
  ON terminal_configs(terminal_id, version DESC);

-- 5. transactions (거래내역)
CREATE TABLE IF NOT EXISTS transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id         uuid NOT NULL REFERENCES terminals(id),
  merchant_id         uuid NOT NULL REFERENCES merchants(id),
  merchant_order_id   text NOT NULL,
  menu_name           text NOT NULL DEFAULT '',
  amount              int NOT NULL,
  barcode_info        text DEFAULT '',
  payment_type        text NOT NULL,
  status              text NOT NULL,
  approved_at         timestamptz NOT NULL,
  synced              bool NOT NULL DEFAULT false,
  user_name           text,
  tid                 text,
  cancelled_at        timestamptz,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_merchant
  ON transactions(merchant_id, approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_terminal
  ON transactions(terminal_id, approved_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_order_id
  ON transactions(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_unsynced
  ON transactions(synced) WHERE synced = false;

-- contact_email 컬럼 추가 (이미 테이블이 존재하는 경우)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS contact_email text;

-- ============================================================
-- Migration 20260320000001: transactions 테이블에 컬럼 추가
-- - user_name: 비플 API 응답의 사용자명
-- - tid: 비플PG 거래번호 (24자리)
-- - cancelled_at: 거래 취소 일시
-- ============================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tid text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- merchant_users: 본인 레코드만 조회
CREATE POLICY "users see own merchant_users"
  ON merchant_users FOR SELECT
  USING (user_id = auth.uid());

-- terminals: 해당 가맹점 관리자만 접근
CREATE POLICY "merchants manage own terminals"
  ON terminals FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );

-- terminal_configs: 해당 가맹점 관리자만 접근
CREATE POLICY "merchants manage own configs"
  ON terminal_configs FOR ALL
  USING (
    terminal_id IN (
      SELECT t.id FROM terminals t
      JOIN merchant_users mu ON mu.merchant_id = t.merchant_id
      WHERE mu.user_id = auth.uid()
    )
  );

-- transactions: 가맹점 관리자 조회 / service_role INSERT
CREATE POLICY "merchants see own transactions"
  ON transactions FOR SELECT
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Offline Detection Functions (Migration 20260320000002)
-- ============================================================

-- 60초 이상 heartbeat 없는 단말기를 offline으로 표시하는 함수
CREATE OR REPLACE FUNCTION mark_stale_terminals_offline()
RETURNS void AS $$
BEGIN
  UPDATE terminals
  SET status = 'offline'
  WHERE status = 'online'
    AND last_seen_at < NOW() - INTERVAL '60 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 헬스체크 API에서 직접 호출할 수 있는 RPC 함수
CREATE OR REPLACE FUNCTION check_terminal_health()
RETURNS TABLE(terminal_id uuid, term_id text, last_seen_at timestamptz, new_status text) AS $$
BEGIN
  RETURN QUERY
  UPDATE terminals
  SET status = 'offline'
  WHERE status = 'online'
    AND last_seen_at < NOW() - INTERVAL '60 seconds'
  RETURNING id, term_id, last_seen_at, status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 초기 데이터 예시 (가맹점 + 관리자 계정 연결)
-- Supabase Auth에서 이메일로 계정 생성 후 user_id 입력
-- ============================================================
-- INSERT INTO merchants (name, biz_no) VALUES ('테스트 가맹점', '000-00-00000');
-- INSERT INTO merchant_users (merchant_id, user_id)
--   VALUES ('<merchants.id>', '<auth.users.id>');

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
