-- Migration: Add offline detection functions for terminal health monitoring
-- Created: 2026-03-20
-- Description: Add functions to mark stale terminals (no heartbeat for 60+ seconds) as offline

-- 60초 이상 heartbeat 없는 단말기를 offline으로 표시하는 함수
CREATE OR REPLACE FUNCTION mark_stale_terminals_offline()
RETURNS void AS $$
BEGIN
  UPDATE terminals
  SET status = 'offline'
  WHERE status = 'online'
    AND last_seen_at < NOW() - INTERVAL '60 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 헬스체크 API에서 직접 호출할 수 있는 RPC 함수
CREATE OR REPLACE FUNCTION check_terminal_health()
RETURNS TABLE(terminal_id uuid, term_id text, last_seen_at timestamptz, new_status text) AS $$
BEGIN
  RETURN QUERY
  UPDATE terminals
  SET status = 'offline'
  WHERE status = 'online'
    AND last_seen_at < NOW() - INTERVAL '60 seconds'
  RETURNING id, term_id, last_seen_at, status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
