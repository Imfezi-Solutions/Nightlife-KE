drop policy "Verified members can publish avatar movement in their room" on realtime.messages;
drop policy "Verified members can view avatar movement in their room" on realtime.messages;
create policy "Verified members can publish avatar movement in their room" on realtime.messages
for insert to authenticated
with check (extension='presence' and split_part((select realtime.topic()),':',1)='club-movement'
 and split_part((select realtime.topic()),':',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and (select app_private.is_verified_club_room_member(split_part((select realtime.topic()),':',2)::uuid)));
create policy "Verified members can view avatar movement in their room" on realtime.messages
for select to authenticated
using (extension='presence' and split_part((select realtime.topic()),':',1)='club-movement'
 and split_part((select realtime.topic()),':',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and (select app_private.is_verified_club_room_member(split_part((select realtime.topic()),':',2)::uuid)));
drop policy "Verified DJs upload audio into their room folder" on storage.objects;
drop policy "Verified room members can listen to approved room audio" on storage.objects;
drop policy "DJs can remove their own room audio" on storage.objects;
create policy "Verified DJs upload audio into their room folder" on storage.objects
for insert to authenticated
with check (bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and split_part(name,'/',2)=(select auth.uid()::text) and (select app_private.can_control_room_music(split_part(name,'/',1)::uuid)));
create policy "Verified room members can listen to approved room audio" on storage.objects
for select to authenticated
using (bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and (select app_private.is_verified_club_room_member(split_part(name,'/',1)::uuid)));
create policy "DJs can remove their own room audio" on storage.objects
for delete to authenticated
using (bucket_id='room-audio' and split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 and split_part(name,'/',2)=(select auth.uid()::text) and (select app_private.can_control_room_music(split_part(name,'/',1)::uuid)));
