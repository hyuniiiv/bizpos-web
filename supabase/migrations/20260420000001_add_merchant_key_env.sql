-- merchant_keys 테이블에 env(운영/개발) 구분 컬럼 추가
ALTER TABLE merchant_keys
  ADD COLUMN IF NOT EXISTS env text NOT NULL DEFAULT 'production'
  CHECK (env IN ('production', 'development'));
