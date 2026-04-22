-- anomaly_alerts 테이블: 이상 거래 감지 알림
-- 실행 위치: Supabase SQL Editor

CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  terminal_id    uuid REFERENCES terminals(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  rule           text NOT NULL CHECK (rule IN ('duplicate_barcode','high_frequency','high_amount')),
  severity       text NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  detail         jsonb,
  resolved       bool NOT NULL DEFAULT false,
  resolved_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- 조회 성능 인덱스 (merchant + unresolved + 최신순)
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_merchant_resolved
  ON anomaly_alerts (merchant_id, resolved, created_at DESC);

-- RLS 활성화
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 가맹점 알림만 접근
DROP POLICY IF EXISTS "merchant_own_anomaly_alerts" ON anomaly_alerts;
CREATE POLICY "merchant_own_anomaly_alerts" ON anomaly_alerts
  USING (
    merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  );
