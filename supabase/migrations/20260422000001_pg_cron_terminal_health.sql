-- pg_cron 기반 단말기 헬스 독립 스케줄
-- 전제: Supabase 대시보드 → Database → Extensions → pg_cron 활성화 필요
-- mark_stale_terminals_offline() 함수는 supabase/schema.sql에 이미 존재

-- 기존 스케줄이 있으면 제거 후 재등록
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-stale-terminals') THEN
    PERFORM cron.unschedule('mark-stale-terminals');
  END IF;
END $$;

SELECT cron.schedule(
  'mark-stale-terminals',
  '* * * * *',
  $$SELECT mark_stale_terminals_offline()$$
);
