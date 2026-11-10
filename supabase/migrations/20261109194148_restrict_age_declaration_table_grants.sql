-- Restrict direct access to the self-declaration record.
revoke all privileges on table public.age_declarations from anon;
revoke all privileges on table public.age_declarations from authenticated;
grant select, insert on table public.age_declarations to authenticated;
