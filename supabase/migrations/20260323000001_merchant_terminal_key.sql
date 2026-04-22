-- ============================================================
-- Migration 20260323000001: merchant_keys 테이블 + terminals 컬럼 추가
-- 비플페이 3종 키 (MID / 암복호화 KEY / HEADER 인증키) 관리
-- ============================================================

-- merchant_keys: 가맹점별 비플페이 키 관리
CREATE TABLE IF NOT EXISTS merchant_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  mid          text NOT NULL,        -- 가맹점코드 MID
  enc_key      text NOT NULL,        -- 암복호화 KEY (AES256-CBC)
  online_ak    text NOT NULL,        -- HEADER 인증키
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_keys_merchant
  ON merchant_keys(merchant_id, is_active);

-- terminals 컬럼 추가: 키 연결 + 단말기 계정 인증
ALTER TABLE terminals
  ADD COLUMN IF NOT EXISTS merchant_key_id      uuid REFERENCES merchant_keys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terminal_account_id  text UNIQUE,
  ADD COLUMN IF NOT EXISTS terminal_account_hash text;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE merchant_keys ENABLE ROW LEVEL SECURITY;

-- merchant_keys: 해당 가맹점 관리자만 접근
CREATE POLICY "merchants manage own keys"
  ON merchant_keys FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchant_keys_updated_at
  BEFORE UPDATE ON merchant_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
