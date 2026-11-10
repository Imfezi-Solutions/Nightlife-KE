-- Make room audio immediately playable after a DJ uploads it.
-- This removes the administrator pre-approval bottleneck while retaining
-- verified-room access, DJ permissions, uploader rights attestation and
-- the ability to reject/remove a track later.
alter table public.dj_queue alter column rights_status set default 'approved';
update public.dj_queue set rights_status = 'approved' where rights_status = 'pending';

drop policy if exists "DJs add licensed queue entries" on public.dj_queue;
create policy "DJs add room tracks immediately" on public.dj_queue
for insert to authenticated
with check (
  (select app_private.can_control_room_music(room_id))
  and added_by = (select auth.uid())
  and rights_status = 'approved'
);

-- Audio formats are validated by the browser and file extension in the client;
-- do not block otherwise valid audio codecs at the storage bucket boundary.
update storage.buckets
set allowed_mime_types = null
where id = 'room-audio';
