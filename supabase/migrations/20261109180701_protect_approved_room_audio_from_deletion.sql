create or replace function app_private.can_delete_room_audio_asset(p_room_id uuid,p_object_path text)
returns boolean language sql stable security definer set search_path=''
as $$
 select app_private.can_control_room_music(p_room_id)
 and not exists(select 1 from public.dj_queue q where q.room_id=p_room_id and q.provider_asset_id=p_object_path and q.rights_status='approved');
$$;
revoke all on function app_private.can_delete_room_audio_asset(uuid,text) from public,anon;
grant execute on function app_private.can_delete_room_audio_asset(uuid,text) to authenticated;
drop policy "DJs can remove their own room audio" on storage.objects;
create policy "DJs can remove their own room audio" on storage.objects for delete to authenticated
using(bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and split_part(name,'/',2)=(select auth.uid()::text) and (select app_private.can_delete_room_audio_asset(split_part(name,'/',1)::uuid,name)));
