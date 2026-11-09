-- Add a covering index for the optional platform administrator grantor foreign key.
-- This supports lookups and referential checks when a grantor account is deleted.
create index if not exists platform_admins_granted_by_idx
  on public.platform_admins (granted_by)
  where granted_by is not null;
