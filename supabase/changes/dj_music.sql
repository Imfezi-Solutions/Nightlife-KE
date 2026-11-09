-- Nightlife KE DJ/music database changes.
-- Applied to Supabase project sauyklppapnsmxcifavq via managed migrations.
-- Do not run this snapshot against an already-migrated database without checking migration history.

create table public.platform_djs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  granted_at timestamptz not null default now()
);
create table public.dj_sessions (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  current_track_id uuid,
  playback_status text not null default 'stopped' check (playback_status in ('playing','paused','stopped')),
  position_ms bigint not null default 0 check (position_ms >= 0),
  started_at timestamptz,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create table public.dj_queue (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  added_by uuid not null references auth.users(id),
  source_type text not null check (source_type in ('original_upload','licensed_provider','public_domain')),
  provider_asset_id text not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  artist text check (artist is null or char_length(artist) <= 160),
  duration_ms integer not null check (duration_ms between 1000 and 1800000),
  rights_reference text not null check (char_length(trim(rights_reference)) between 4 and 500),
  rights_status text not null default 'pending' check (rights_status in ('pending','approved','rejected','expired')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, room_id)
);
alter table public.dj_sessions add constraint dj_sessions_current_track_same_room_fkey
  foreign key (current_track_id, room_id) references public.dj_queue(id, room_id) on delete set null (current_track_id);

create index dj_queue_room_position_idx on public.dj_queue(room_id,position,created_at);
create index dj_queue_added_by_idx on public.dj_queue(added_by);
create index dj_sessions_current_track_room_idx on public.dj_sessions(current_track_id,room_id);
create index dj_sessions_updated_by_idx on public.dj_sessions(updated_by);

alter table public.dj_sessions enable row level security;
alter table public.dj_queue enable row level security;
alter table public.platform_djs enable row level security;

create or replace function app_private.can_control_room_music(p_room_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
   select 1 from public.rooms r
   join public.club_members cm on cm.club_id=r.club_id and cm.user_id=auth.uid()
   where r.id=p_room_id and r.is_active=true
     and (cm.role in ('owner','moderator','dj') or exists (
       select 1 from public.platform_djs pd where pd.user_id=auth.uid() and pd.is_active=true
     ))
     and exists (select 1 from public.age_verifications av where av.user_id=auth.uid()
       and av.status='verified' and av.verified_at is not null and av.expires_at>now())
 );
$$;
revoke all on function app_private.can_control_room_music(uuid) from public,anon;
grant execute on function app_private.can_control_room_music(uuid) to authenticated;

create policy "Verified members read DJ sessions" on public.dj_sessions for select to authenticated
using (app_private.is_verified_club_room_member(room_id));
create policy "DJs create DJ sessions" on public.dj_sessions for insert to authenticated
with check ((select app_private.can_control_room_music(room_id)) and updated_by=(select auth.uid()));
create policy "DJs update DJ sessions" on public.dj_sessions for update to authenticated
using ((select app_private.can_control_room_music(room_id)))
with check ((select app_private.can_control_room_music(room_id)) and updated_by=(select auth.uid()));

create policy "Verified members read approved DJ queue" on public.dj_queue for select to authenticated
using (rights_status='approved' and app_private.is_verified_club_room_member(room_id));
create policy "DJs add licensed queue entries" on public.dj_queue for insert to authenticated
with check ((select app_private.can_control_room_music(room_id)) and added_by=(select auth.uid()) and rights_status='pending');
create policy "DJs moderate queue entries" on public.dj_queue for update to authenticated
using ((select app_private.can_control_room_music(room_id)))
with check ((select app_private.can_control_room_music(room_id)) and added_by=(select auth.uid()) and rights_status='pending');
create policy "DJs remove queue entries" on public.dj_queue for delete to authenticated
using ((select app_private.can_control_room_music(room_id)));

create policy "Users read own platform DJ flag" on public.platform_djs for select to authenticated
using (user_id=(select auth.uid()));
revoke all on public.platform_djs from anon,authenticated;
grant select on public.platform_djs to authenticated;
revoke all on public.dj_sessions,public.dj_queue from anon,authenticated;
grant select,insert,update on public.dj_sessions to authenticated;
grant select,insert,update,delete on public.dj_queue to authenticated;

alter publication supabase_realtime add table public.dj_sessions;
alter publication supabase_realtime add table public.dj_queue;
