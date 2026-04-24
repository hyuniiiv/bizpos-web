-- ============================================================
-- Migration 20260424000001: merchant_keys에 store_id 추가
-- 매장(store) → 가맹점 키 계층 구조 구현
-- ============================================================

ALTER TABLE merchant_keys
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_merchant_keys_store ON merchant_keys(store_id);

-- 기존 키 백필: 각 가맹점의 첫 번째 매장에 연결
UPDATE merchant_keys mk
SET store_id = (
  SELECT id FROM stores
  WHERE merchant_id = mk.merchant_id
  ORDER BY created_at
  LIMIT 1
)
WHERE store_id IS NULL;

-- RLS 재생성 (기존 정책 유지)
DROP POLICY IF EXISTS "merchants manage own keys" ON merchant_keys;

CREATE POLICY "merchants manage own keys"
  ON merchant_keys FOR ALL
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );
