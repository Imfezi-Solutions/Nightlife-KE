-- Keep platform audit logs inaccessible to browser roles while documenting an explicit deny policy.
create policy "No direct client access to platform audit logs"
on public.platform_audit_logs
for all
to anon, authenticated
using (false)
with check (false);
