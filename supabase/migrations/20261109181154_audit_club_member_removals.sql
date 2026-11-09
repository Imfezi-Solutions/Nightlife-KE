create or replace function app_private.remove_club_member(p_club_id uuid,p_target_user_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_actor_role text; v_target_role text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select role into v_actor_role from public.club_members where club_id=p_club_id and user_id=auth.uid();
 select role into v_target_role from public.club_members where club_id=p_club_id and user_id=p_target_user_id;
 if v_actor_role is null or v_actor_role not in ('owner','moderator') then raise exception 'Club moderation permission required'; end if;
 if not exists(select 1 from public.age_verifications where user_id=auth.uid() and status='verified' and verified_at is not null and expires_at>now()) then raise exception '18+ verification required'; end if;
 if v_target_role is null or v_target_role='owner' or p_target_user_id=auth.uid() then raise exception 'Member cannot be removed'; end if;
 if v_actor_role='moderator' and v_target_role<>'member' then raise exception 'Moderators can remove members only'; end if;
 delete from public.club_members where club_id=p_club_id and user_id=p_target_user_id;
 insert into public.platform_audit_logs(actor_id,action,target_type,target_id,details)
 values(auth.uid(),'club.member.removed','club_member',p_target_user_id,jsonb_build_object('club_id',p_club_id,'removed_role',v_target_role));
 return true;
end;
$$;
revoke all on function app_private.remove_club_member(uuid,uuid) from public,anon;
grant execute on function app_private.remove_club_member(uuid,uuid) to authenticated;
create or replace function public.remove_club_member(p_club_id uuid,p_target_user_id uuid)
returns boolean language sql security invoker set search_path=''
as $$ select app_private.remove_club_member(p_club_id,p_target_user_id); $$;
revoke all on function public.remove_club_member(uuid,uuid) from public,anon;
grant execute on function public.remove_club_member(uuid,uuid) to authenticated;
revoke delete on public.club_members from authenticated;
