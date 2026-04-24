-- Migration 20260425000004: terminals.store_id 완성
-- Phase 1a: additive (인덱스 + 백필 + FK)
--
-- 목표: terminals.store_id를 100% 백필하고 FK 제약 추가
-- 현황: store_id NULL 100% (6개 전부)
--
-- 작업 순서:
-- 1. 인덱스 생성 (조회 성능)
-- 2. Default Store 자동생성 및 백필
-- 3. Foreign Key ON DELETE RESTRICT 추가
--
-- 안전성: ✅ Default Store 자동생성으로 데이터 정합성 보장
-- 롤백: 역순으로 DROP INDEX, DELETE stores, DROP CONSTRAINT

-- 1. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_terminals_store_id ON terminals(store_id);
CREATE INDEX IF NOT EXISTS idx_terminals_merchant_store ON terminals(merchant_id, store_id);

-- 2. 백필: Default Store 자동생성 및 terminals 업데이트
DO $$ DECLARE mid UUID; BEGIN
  -- 각 merchant별로 기본매장 생성 (이미 존재하면 무시)
  FOR mid IN SELECT DISTINCT merchant_id FROM terminals WHERE store_id IS NULL
  LOOP
    INSERT INTO stores (merchant_id, store_name, is_active)
    VALUES (mid, '기본매장', true) ON CONFLICT DO NOTHING;

    -- terminals.store_id 백필
    UPDATE terminals
    SET store_id = (SELECT id FROM stores WHERE merchant_id = mid LIMIT 1)
    WHERE merchant_id = mid AND store_id IS NULL;
  END LOOP;
END $$;

-- 3. Foreign Key 제약 추가
ALTER TABLE terminals DROP CONSTRAINT IF EXISTS terminals_store_id_fkey;
ALTER TABLE terminals
  ADD CONSTRAINT terminals_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT;

-- 검증
DO $$
DECLARE
  unfilled INTEGER;
BEGIN
  SELECT COUNT(*) INTO unfilled FROM terminals WHERE store_id IS NULL;
  IF unfilled > 0 THEN
    RAISE WARNING 'Phase 1a 백필 실패: % 개 행이 여전히 NULL', unfilled;
  ELSE
    RAISE NOTICE 'Phase 1a 완료: 모든 terminals.store_id 백필됨';
  END IF;
END $$;
