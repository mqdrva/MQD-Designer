-- SELECT FOR UPDATE in the private staging RPCs requires UPDATE privilege.
-- Only the existing backend service role may lock these transient records.
grant update on public.mqd_master_uploads to service_role;
