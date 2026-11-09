create or replace function app_private.review_club_report_by_club_moderator(p_report_id uuid,p_club_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.club_members where club_id=p_club_id and user_id=auth.uid() and role in ('owner','moderator')) then raise exception 'Club moderation permission required'; end if;
 if not exists(select 1 from public.age_verifications where user_id=auth.uid() and status='verified' and verified_at is not null and expires_at>now()) then raise exception '18+ verification required'; end if;
 if p_status not in ('reviewing','resolved','dismissed') then raise exception 'Invalid report status'; end if;
 update public.club_reports set status=p_status,reviewed_by=auth.uid(),reviewed_at=now() where id=p_report_id and club_id=p_club_id;
 if not found then raise exception 'Report not found'; end if;
 insert into public.platform_audit_logs(actor_id,action,target_type,target_id,details) values(auth.uid(),'club_report.reviewed_by_club_moderator','club_report',p_report_id,jsonb_build_object('club_id',p_club_id,'status',p_status));
 return true;
end;
$$;
revoke all on function app_private.review_club_report_by_club_moderator(uuid,uuid,text) from public,anon;
grant execute on function app_private.review_club_report_by_club_moderator(uuid,uuid,text) to authenticated;
create or replace function public.review_club_report_by_club_moderator(p_report_id uuid,p_club_id uuid,p_status text)
returns boolean language sql security invoker set search_path=''
as $$ select app_private.review_club_report_by_club_moderator(p_report_id,p_club_id,p_status); $$;
revoke all on function public.review_club_report_by_club_moderator(uuid,uuid,text) from public,anon;
grant execute on function public.review_club_report_by_club_moderator(uuid,uuid,text) to authenticated;
revoke update on public.club_reports from authenticated;
