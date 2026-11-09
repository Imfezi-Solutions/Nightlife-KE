drop policy "Verified room members can listen to approved room audio" on storage.objects;
create policy "Verified room members can listen to approved room audio" on storage.objects
for select to authenticated
using (bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and (select app_private.is_verified_club_room_member(split_part(name,'/',1)::uuid)));
