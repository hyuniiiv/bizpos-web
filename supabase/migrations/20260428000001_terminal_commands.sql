-- terminal_commands: 원격 명령 전송 테이블
-- admin이 INSERT → 단말기 Realtime 수신 → 실행 후 executed_at + result UPDATE

create table if not exists public.terminal_commands (
  id            uuid primary key default gen_random_uuid(),
  terminal_id   uuid not null references public.terminals(id) on delete cascade,
  command       text not null check (command in ('restart','flush_queue','upload_log','screenshot','reconnect')),
  args          jsonb,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  received_at   timestamptz,
  executed_at   timestamptz,
  result        jsonb,
  error         text
);

create index if not exists terminal_commands_terminal_id_idx on public.terminal_commands(terminal_id);
create index if not exists terminal_commands_created_at_idx  on public.terminal_commands(created_at desc);

-- ──────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────
alter table public.terminal_commands enable row level security;

-- INSERT: 해당 merchant 소속 인증 사용자
create policy "merchant users can insert commands" on public.terminal_commands
  for insert
  with check (
    exists (
      select 1 from public.terminals t
      join public.merchant_users mu on mu.merchant_id = t.merchant_id
      where t.id = terminal_commands.terminal_id
        and mu.user_id = auth.uid()
    )
  );

-- SELECT: 해당 merchant 소속 인증 사용자
create policy "merchant users can view commands" on public.terminal_commands
  for select
  using (
    exists (
      select 1 from public.terminals t
      join public.merchant_users mu on mu.merchant_id = t.merchant_id
      where t.id = terminal_commands.terminal_id
        and mu.user_id = auth.uid()
    )
  );

-- UPDATE (executed_at, result, error): 단말기(anon) 허용 — terminal_id 기반 제한은 앱 레이어에서 처리
create policy "terminal can update own commands" on public.terminal_commands
  for update
  using (true)
  with check (true);

-- ──────────────────────────────────────────────────────
-- Realtime 활성화 (INSERT 이벤트 수신용)
-- ──────────────────────────────────────────────────────
alter publication supabase_realtime add table public.terminal_commands;

-- ──────────────────────────────────────────────────────
-- Storage 버킷 (로그 / 스크린샷)
-- ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('terminal-logs',        'terminal-logs',        false, 10485760, array['text/plain']),
  ('terminal-screenshots', 'terminal-screenshots', false, 5242880,  array['image/png'])
on conflict (id) do nothing;

-- 업로드: service_role(서버 API)만 허용
create policy "service role upload terminal logs" on storage.objects
  for insert to service_role
  with check (bucket_id in ('terminal-logs','terminal-screenshots'));

-- 읽기: 인증된 사용자 (merchant 관리자)
create policy "merchant users read terminal files" on storage.objects
  for select
  using (
    bucket_id in ('terminal-logs','terminal-screenshots')
    and auth.role() = 'authenticated'
  );
