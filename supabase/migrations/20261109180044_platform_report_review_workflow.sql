-- Platform moderation report review and audit workflow.
create or replace function app_private.review_club_report(p_report_id uuid,p_actor_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_role text;
begin
 select role into v_role from public.platform_admins where user_id=p_actor_id;
 if v_role is null or v_role not in ('super_admin','platform_admin','moderator','support_admin') then raise exception 'Platform moderation permission required'; end if;
 if p_status not in ('reviewing','resolved','dismissed') then raise exception 'Invalid report status'; end if;
 update public.club_reports set status=p_status,reviewed_by=p_actor_id,reviewed_at=now() where id=p_report_id;
 if not found then raise exception 'Report not found'; end if;
 insert into public.platform_audit_logs(actor_id,action,target_type,target_id,details)
 values(p_actor_id,'club_report.status_changed','club_report',p_report_id,jsonb_build_object('status',p_status));
 return true;
end;
$$;
revoke all on function app_private.review_club_report(uuid,uuid,text) from public,anon,authenticated;
grant execute on function app_private.review_club_report(uuid,uuid,text) to service_role;
create or replace function public.review_club_report(p_report_id uuid,p_actor_id uuid,p_status text)
returns boolean language sql security invoker set search_path=''
as $$ select app_private.review_club_report(p_report_id,p_actor_id,p_status); $$;
revoke all on function public.review_club_report(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.review_club_report(uuid,uuid,text) to service_role;
