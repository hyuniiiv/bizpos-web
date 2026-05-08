-- anomaly_rule_settings: 가맹점별 이상 거래 감지 규칙 설정
-- 실행 위치: Supabase SQL Editor

CREATE TABLE IF NOT EXISTS anomaly_rule_settings (
  merchant_id  uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  rule         text NOT NULL CHECK (rule IN ('duplicate_barcode','high_frequency','high_amount')),
  enabled      bool NOT NULL DEFAULT true,
  params       jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY  (merchant_id, rule)
);

ALTER TABLE anomaly_rule_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_own_rule_settings" ON anomaly_rule_settings
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );
