-- 메뉴 양방향 동기화를 위한 updated_at 컬럼 추가
-- LWW(Last-Write-Wins) 충돌 해결 기준: epoch milliseconds
-- 사용자가 Supabase 대시보드 SQL Editor에서 수동 실행

ALTER TABLE menus
ADD COLUMN IF NOT EXISTS updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

CREATE INDEX IF NOT EXISTS idx_menus_updated_at ON menus(updated_at DESC);

-- 기존 메뉴는 현재 시각으로 초기화
UPDATE menus
SET updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
WHERE updated_at IS NULL;
