drop policy "Profiles are readable by signed-in users" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
create or replace view public.public_profiles with (security_barrier=true) as
select id,username,display_name,avatar_url,county_id,bio,avatar_config,created_at from public.profiles;
revoke all on public.public_profiles from public,anon,authenticated;
grant select on public.public_profiles to authenticated;
