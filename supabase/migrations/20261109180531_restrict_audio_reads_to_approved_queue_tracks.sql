create or replace function app_private.can_read_room_audio_asset(p_room_id uuid,p_object_path text)
returns boolean language sql stable security definer set search_path=''
as $$
 select app_private.is_verified_club_room_member(p_room_id)
 and exists(select 1 from public.dj_queue q where q.room_id=p_room_id and q.provider_asset_id=p_object_path and q.source_type in ('original_upload','public_domain') and q.rights_status='approved');
$$;
revoke all on function app_private.can_read_room_audio_asset(uuid,text) from public,anon;
grant execute on function app_private.can_read_room_audio_asset(uuid,text) to authenticated;
drop policy "Verified room members can listen to approved room audio" on storage.objects;
create policy "Verified room members can listen to approved room audio" on storage.objects
for select to authenticated
using(bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and (select app_private.can_read_room_audio_asset(split_part(name,'/',1)::uuid,name)));
