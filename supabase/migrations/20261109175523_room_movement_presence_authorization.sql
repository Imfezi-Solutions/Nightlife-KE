-- Private room movement presence authorization.
-- Applied to Supabase project sauyklppapnsmxcifavq as migration 20261109175523.
-- The movement topic is isolated from the chat-presence topic. Only currently
-- verified members of the room can publish or receive avatar movement state.

create policy "Verified members can publish avatar movement in their room"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'presence'
  and split_part((select realtime.topic()), ':', 1) = 'club-movement'
  and split_part((select realtime.topic()), ':', 2) ~* '^[0-9a-f-]{36}$'
  and (select app_private.is_verified_club_room_member(split_part((select realtime.topic()), ':', 2)::uuid))
);

create policy "Verified members can view avatar movement in their room"
on realtime.messages
for select
to authenticated
using (
  extension = 'presence'
  and split_part((select realtime.topic()), ':', 1) = 'club-movement'
  and split_part((select realtime.topic()), ':', 2) ~* '^[0-9a-f-]{36}$'
  and (select app_private.is_verified_club_room_member(split_part((select realtime.topic()), ':', 2)::uuid))
);
