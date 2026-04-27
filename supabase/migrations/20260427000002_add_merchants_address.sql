-- merchants 테이블에 address 컬럼 추가
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS address text;
