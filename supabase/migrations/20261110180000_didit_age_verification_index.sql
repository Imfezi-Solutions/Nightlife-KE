-- Speed up trusted Didit webhook lookups by the provider's session reference.
create index if not exists age_verifications_didit_session_idx
on public.age_verifications (provider_reference)
where provider = 'didit' and provider_reference is not null;
