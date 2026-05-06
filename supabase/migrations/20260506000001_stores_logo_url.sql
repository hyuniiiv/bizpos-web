-- stores 테이블에 외부 디스플레이용 로고 URL 컬럼 추가
alter table public.stores add column if not exists logo_url text;
