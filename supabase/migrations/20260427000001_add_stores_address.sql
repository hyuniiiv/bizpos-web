-- stores 테이블에 address 컬럼 추가 (biz_no는 merchant 정보)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS address text;
