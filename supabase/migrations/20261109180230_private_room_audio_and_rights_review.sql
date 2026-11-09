-- Private storage for rights-approved original/public-domain audio and admin rights review.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('room-audio','room-audio',false,26214400,array['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/mp4','audio/aac','audio/flac'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Verified DJs upload audio into their room folder" on storage.objects for insert to authenticated
with check(bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f-]{36}$' and split_part(name,'/',2)=(select auth.uid()::text) and (select app_private.can_control_room_music(split_part(name,'/',1)::uuid)));
create policy "Verified room members can listen to approved room audio" on storage.objects for select to authenticated
using(bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f-]{36}$' and (select app_private.is_verified_club_room_member(split_part(name,'/',1)::uuid)));
create policy "DJs can remove their own room audio" on storage.objects for delete to authenticated
using(bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f-]{36}$' and split_part(name,'/',2)=(select auth.uid()::text) and (select app_private.can_control_room_music(split_part(name,'/',1)::uuid)));
create or replace function app_private.review_dj_track(p_track_id uuid,p_actor_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_role text;
begin
 select role into v_role from public.platform_admins where user_id=p_actor_id;
 if v_role is null or v_role not in ('super_admin','platform_admin') then raise exception 'Music rights review permission required'; end if;
 if p_status not in ('approved','rejected','expired') then raise exception 'Invalid rights status'; end if;
 update public.dj_queue set rights_status=p_status where id=p_track_id and rights_status='pending';
 if not found then raise exception 'Pending track not found'; end if;
 insert into public.platform_audit_logs(actor_id,action,target_type,target_id,details)
 values(p_actor_id,'dj_track.rights_status_changed','dj_queue',p_track_id,jsonb_build_object('rights_status',p_status));
 return true;
end;
$$;
revoke all on function app_private.review_dj_track(uuid,uuid,text) from public,anon,authenticated;
grant execute on function app_private.review_dj_track(uuid,uuid,text) to service_role;
create or replace function public.review_dj_track(p_track_id uuid,p_actor_id uuid,p_status text)
returns boolean language sql security invoker set search_path=''
as $$ select app_private.review_dj_track(p_track_id,p_actor_id,p_status); $$;
revoke all on function public.review_dj_track(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.review_dj_track(uuid,uuid,text) to service_role;
