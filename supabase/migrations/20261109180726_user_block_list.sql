create table public.user_blocks(blocker_id uuid not null references auth.users(id) on delete cascade,blocked_user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(blocker_id,blocked_user_id),constraint user_blocks_not_self check(blocker_id<>blocked_user_id));
create index user_blocks_blocked_idx on public.user_blocks(blocked_user_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon,authenticated;
grant select,insert,delete on public.user_blocks to authenticated;
create policy "Users can read their own blocks" on public.user_blocks for select to authenticated using(blocker_id=(select auth.uid()));
create policy "Users can block other accounts" on public.user_blocks for insert to authenticated with check(blocker_id=(select auth.uid()) and blocked_user_id<>(select auth.uid()));
create policy "Users can unblock accounts they blocked" on public.user_blocks for delete to authenticated using(blocker_id=(select auth.uid()));
