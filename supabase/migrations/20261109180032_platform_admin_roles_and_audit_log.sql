-- Platform role assignments and administrative audit trail.
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','platform_admin','moderator','finance_admin','support_admin')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null check (char_length(action) between 3 and 120),
  target_type text not null check (char_length(target_type) between 2 and 80),
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index platform_admins_role_idx on public.platform_admins(role);
create index platform_audit_logs_created_idx on public.platform_audit_logs(created_at desc);
create index platform_audit_logs_actor_idx on public.platform_audit_logs(actor_id,created_at desc);
alter table public.platform_admins enable row level security;
alter table public.platform_audit_logs enable row level security;
revoke all on public.platform_admins, public.platform_audit_logs from anon, authenticated;
grant select on public.platform_admins to authenticated;
create policy "Platform admins can read their own assignment" on public.platform_admins for select to authenticated using (user_id=(select auth.uid()));
create or replace function app_private.is_platform_admin(p_roles text[] default null)
returns boolean language sql stable security definer set search_path=''
as $$ select exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()) and (p_roles is null or pa.role=any(p_roles))); $$;
revoke all on function app_private.is_platform_admin(text[]) from public,anon;
grant execute on function app_private.is_platform_admin(text[]) to authenticated;
