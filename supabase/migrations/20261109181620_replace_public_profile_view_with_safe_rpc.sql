drop view if exists public.public_profiles;
create or replace function app_private.get_public_profiles(p_user_ids uuid[])
returns table(id uuid,username text,display_name text,avatar_url text,county_id integer,bio text,avatar_config jsonb,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return query select p.id,p.username,p.display_name,p.avatar_url,p.county_id,p.bio,p.avatar_config,p.created_at from public.profiles p where p.id=any(coalesce(p_user_ids,array[]::uuid[]));
end;
$$;
revoke all on function app_private.get_public_profiles(uuid[]) from public,anon;
grant execute on function app_private.get_public_profiles(uuid[]) to authenticated;
create or replace function public.get_public_profiles(p_user_ids uuid[])
returns table(id uuid,username text,display_name text,avatar_url text,county_id integer,bio text,avatar_config jsonb,created_at timestamptz)
language sql security invoker set search_path=''
as $$ select * from app_private.get_public_profiles(p_user_ids); $$;
revoke all on function public.get_public_profiles(uuid[]) from public,anon;
grant execute on function public.get_public_profiles(uuid[]) to authenticated;
