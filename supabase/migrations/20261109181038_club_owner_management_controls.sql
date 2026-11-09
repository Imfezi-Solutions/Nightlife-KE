create or replace function app_private.update_club_settings(p_club_id uuid,p_name text,p_description text,p_visibility text,p_capacity integer)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_member_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.club_members where club_id=p_club_id and user_id=auth.uid() and role='owner') then raise exception 'Club owner permission required'; end if;
 if not exists(select 1 from public.age_verifications where user_id=auth.uid() and status='verified' and verified_at is not null and expires_at>now()) then raise exception '18+ verification required'; end if;
 if length(trim(p_name))<3 or length(trim(p_name))>60 then raise exception 'Club name must be 3 to 60 characters'; end if;
 if p_description is not null and length(p_description)>500 then raise exception 'Description is too long'; end if;
 if p_visibility not in ('public','invite_only') then raise exception 'Invalid visibility'; end if;
 if p_capacity<2 or p_capacity>30 then raise exception 'Capacity must be between 2 and 30'; end if;
 select count(*) into v_member_count from public.club_members where club_id=p_club_id;
 if p_capacity<v_member_count then raise exception 'Capacity cannot be lower than current membership'; end if;
 update public.clubs set name=trim(p_name),description=nullif(trim(coalesce(p_description,'')),''),visibility=p_visibility,capacity=p_capacity,updated_at=now() where id=p_club_id;
 if not found then raise exception 'Club not found'; end if;
 return true;
end;
$$;
create or replace function app_private.rotate_club_invitation_code(p_club_id uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare v_code text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.club_members where club_id=p_club_id and user_id=auth.uid() and role='owner') then raise exception 'Club owner permission required'; end if;
 if not exists(select 1 from public.age_verifications where user_id=auth.uid() and status='verified' and verified_at is not null and expires_at>now()) then raise exception '18+ verification required'; end if;
 if not exists(select 1 from public.clubs where id=p_club_id and visibility='invite_only') then raise exception 'Invitation codes are only available for private clubs'; end if;
 v_code:=upper(encode(extensions.gen_random_bytes(12),'hex'));
 update public.clubs set invitation_code_hash=extensions.digest(convert_to(v_code,'UTF8'),'sha256'),updated_at=now() where id=p_club_id;
 return v_code;
end;
$$;
create or replace function app_private.set_club_member_role(p_club_id uuid,p_target_user_id uuid,p_role text)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.club_members where club_id=p_club_id and user_id=auth.uid() and role='owner') then raise exception 'Club owner permission required'; end if;
 if not exists(select 1 from public.age_verifications where user_id=auth.uid() and status='verified' and verified_at is not null and expires_at>now()) then raise exception '18+ verification required'; end if;
 if p_role not in ('member','moderator','dj') then raise exception 'Invalid member role'; end if;
 if p_target_user_id=auth.uid() then raise exception 'Owners cannot change their own role'; end if;
 update public.club_members set role=p_role where club_id=p_club_id and user_id=p_target_user_id and role<>'owner';
 if not found then raise exception 'Member not found or cannot change owner role'; end if;
 return true;
end;
$$;
revoke all on function app_private.update_club_settings(uuid,text,text,text,integer) from public,anon;
revoke all on function app_private.rotate_club_invitation_code(uuid) from public,anon;
revoke all on function app_private.set_club_member_role(uuid,uuid,text) from public,anon;
grant execute on function app_private.update_club_settings(uuid,text,text,text,integer) to authenticated;
grant execute on function app_private.rotate_club_invitation_code(uuid) to authenticated;
grant execute on function app_private.set_club_member_role(uuid,uuid,text) to authenticated;
create or replace function public.update_club_settings(p_club_id uuid,p_name text,p_description text,p_visibility text,p_capacity integer)
returns boolean language sql security invoker set search_path='' as $$ select app_private.update_club_settings(p_club_id,p_name,p_description,p_visibility,p_capacity); $$;
create or replace function public.rotate_club_invitation_code(p_club_id uuid)
returns text language sql security invoker set search_path='' as $$ select app_private.rotate_club_invitation_code(p_club_id); $$;
create or replace function public.set_club_member_role(p_club_id uuid,p_target_user_id uuid,p_role text)
returns boolean language sql security invoker set search_path='' as $$ select app_private.set_club_member_role(p_club_id,p_target_user_id,p_role); $$;
revoke all on function public.update_club_settings(uuid,text,text,text,integer) from public,anon;
revoke all on function public.rotate_club_invitation_code(uuid) from public,anon;
revoke all on function public.set_club_member_role(uuid,uuid,text) from public,anon;
grant execute on function public.update_club_settings(uuid,text,text,text,integer) to authenticated;
grant execute on function public.rotate_club_invitation_code(uuid) to authenticated;
grant execute on function public.set_club_member_role(uuid,uuid,text) to authenticated;
