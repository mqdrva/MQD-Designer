-- Full-resolution inline originals can exceed the REST role's inherited 8s limit.
-- PostgREST hoists this setting for this RPC only. Preserve its invoker security,
-- service-role-only grant, team lock, revision checks and immutable versions.
alter function public.mqd_save_team_master(uuid,integer,jsonb,boolean,uuid)
  set statement_timeout = '60s';
notify pgrst, 'reload schema';
