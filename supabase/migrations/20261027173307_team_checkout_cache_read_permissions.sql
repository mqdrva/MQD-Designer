begin;
create or replace function public.mqd_team_checkout_master(p_team uuid,p_version uuid)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare result jsonb;
begin
 -- Published versions already reject updates and deletes via their immutable trigger.
 -- A plain SELECT preserves the existing read-only service privilege.
 perform id from public.mqd_team_master_versions where id=p_version and team_id=p_team;
 if not found then return null;end if;
 select projection into result from public.mqd_team_checkout_projections where version_id=p_version and team_id=p_team;
 if found then return result;end if;
 result:=public.mqd_build_team_checkout_projection(p_team,p_version);
 insert into public.mqd_team_checkout_projections(version_id,team_id,projection)
 values(p_version,p_team,result) on conflict(version_id) do nothing;
 return result;
end$$;
revoke all on function public.mqd_team_checkout_master(uuid,uuid) from public,anon,authenticated;
grant execute on function public.mqd_team_checkout_master(uuid,uuid) to service_role;

notify pgrst,'reload schema';
commit;
