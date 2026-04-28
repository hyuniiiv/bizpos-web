-- terminal_admin: JWT app_metadata 기반 전체 조회 권한
-- merchant_users 매핑 없이 모든 가맹점/매장/단말기/키/거래 조회 가능

create or replace function public.is_terminal_admin() returns boolean as $$
  select auth.jwt() -> 'app_metadata' ->> 'role' = 'terminal_admin'
$$ language sql security definer stable;

create policy "terminal_admin view all merchants" on public.merchants
  for select using (is_terminal_admin());

create policy "terminal_admin view all stores" on public.stores
  for select using (is_terminal_admin());

create policy "terminal_admin view all terminals" on public.terminals
  for select using (is_terminal_admin());

create policy "terminal_admin view all merchant_keys" on public.merchant_keys
  for select using (is_terminal_admin());

create policy "terminal_admin view all transactions" on public.transactions
  for select using (is_terminal_admin());

create policy "terminal_admin view all merchant_users" on public.merchant_users
  for select using (is_terminal_admin());
