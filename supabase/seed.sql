-- ============================================================
-- BIZPOS Online Management — 테스트용 시드 데이터
-- ============================================================
-- 주의: 이 파일은 개발/테스트 환경 전용입니다.
--       운영 배포 전 반드시 실제 데이터로 교체하거나 삭제하세요.
--
-- 실행 순서:
--   1. supabase/schema.sql 먼저 실행
--   2. supabase/migrations/ 내 파일 순서대로 실행
--   3. 이 파일(seed.sql) 마지막에 실행
-- ============================================================

-- ============================================================
-- 1. 테스트 가맹점
-- ============================================================
-- merchant_id: 실제 비플 가맹점 코드로 변경 (예: 'M2024001234')
-- biz_no: 실제 사업자등록번호로 변경

INSERT INTO merchants (name, biz_no, merchant_id, contact_email)
VALUES
  ('테스트 구내식당', '000-00-00000', 'TEST123456', 'admin@test.com')
ON CONFLICT (biz_no) DO NOTHING;

-- ============================================================
-- 2. 테스트 단말기
-- ============================================================
-- 주의: 아래 INSERT는 위 가맹점이 생성된 후 실행해야 합니다.
--       merchant_id 서브쿼리가 자동으로 연결합니다.
--
-- activation_code: 단말기 앱에서 입력할 8자리 코드 (대문자+숫자)
-- status: 'offline' | 'online' (초기값은 offline)

INSERT INTO terminals (merchant_id, term_id, name, corner, activation_code, status)
VALUES
  (
    (SELECT id FROM merchants WHERE merchant_id = 'TEST123456'),
    'TERM-001',
    '1번 키오스크',
    '메인홀',
    'ABCD1234',
    'offline'
  ),
  (
    (SELECT id FROM merchants WHERE merchant_id = 'TEST123456'),
    'TERM-002',
    '2번 키오스크',
    '사이드코너',
    'EFGH5678',
    'offline'
  )
ON CONFLICT (merchant_id, term_id) DO NOTHING;

-- ============================================================
-- 3. 테스트 거래내역 (선택적)
-- ============================================================
-- 단말기가 활성화된 이후 실제 거래가 쌓이므로,
-- UI 개발/확인용으로만 필요할 때 아래 주석을 해제하세요.

/*
INSERT INTO transactions (
  terminal_id,
  merchant_id,
  merchant_order_id,
  menu_name,
  amount,
  payment_type,
  status,
  approved_at,
  synced,
  user_name,
  tid
)
SELECT
  t.id,
  t.merchant_id,
  'TEST-ORDER-001',
  '비빔밥',
  8000,
  'QR',
  'approved',
  NOW() - INTERVAL '1 hour',
  true,
  '홍길동',
  'TID20260320000001'
FROM terminals t
WHERE t.term_id = 'TERM-001'
  AND t.merchant_id = (SELECT id FROM merchants WHERE merchant_id = 'TEST123456')
ON CONFLICT (merchant_order_id) DO NOTHING;
*/

-- ============================================================
-- 4. 관리자 계정 연결
-- ============================================================
-- Supabase Dashboard > Authentication > Users 에서
-- 이메일(admin@test.com)로 사용자를 먼저 생성한 뒤,
-- 아래 주석을 해제하고 실제 user_id(UUID)를 입력하세요.

/*
INSERT INTO merchant_users (merchant_id, user_id, role)
VALUES (
  (SELECT id FROM merchants WHERE merchant_id = 'TEST123456'),
  '<Supabase Auth user UUID를 여기에 입력>',
  'admin'
)
ON CONFLICT (merchant_id, user_id) DO NOTHING;
*/

-- ============================================================
-- 확인 쿼리 (시드 적용 후 결과 검증)
-- ============================================================
-- SELECT * FROM merchants;
-- SELECT * FROM terminals;
-- SELECT * FROM merchant_users;
