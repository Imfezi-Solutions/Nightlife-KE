-- Record a user's explicit 18+ self-declaration separately from independent age verification.
create table if not exists public.age_declarations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  declared_at timestamptz not null default now(),
  policy_version text not null,
  accepted boolean not null default true check (accepted = true)
);

alter table public.age_declarations enable row level security;
grant select, insert on public.age_declarations to authenticated;
revoke update, delete on public.age_declarations from anon, authenticated;

drop policy if exists "Users can read their own age declaration" on public.age_declarations;
create policy "Users can read their own age declaration"
on public.age_declarations for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own age declaration" on public.age_declarations;
create policy "Users can create their own age declaration"
on public.age_declarations for insert
to authenticated
with check ((select auth.uid()) = user_id and accepted = true);
