begin;
-- Cache only the service-only fingerprint projection, never customer edits or
-- access decisions. Originals and immutable purchased versions stay unchanged.
create table public.mqd_team_checkout_projections (
 version_id uuid primary key references public.mqd_team_master_versions(id) on delete cascade,
 team_id uuid not null,
 projection jsonb not null
);
alter table public.mqd_team_checkout_projections enable row level security;
revoke all on public.mqd_team_checkout_projections from public,anon,authenticated;
grant select,insert,delete on public.mqd_team_checkout_projections to service_role;

alter function public.mqd_team_checkout_master(uuid,uuid) rename to mqd_build_team_checkout_projection;
create function public.mqd_team_checkout_master(p_team uuid,p_version uuid)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare result jsonb;
begin
 -- Serialize against updates/deletion so an invalidated value cannot be put
 -- back by an in-flight build. The lookup does not read/decompress artwork.
 perform id from public.mqd_team_master_versions where id=p_version and team_id=p_team for share;
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

create function public.mqd_invalidate_team_checkout_projection()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 delete from public.mqd_team_checkout_projections where version_id=old.id;
 return new;
end$$;
revoke all on function public.mqd_invalidate_team_checkout_projection() from public,anon,authenticated;
grant execute on function public.mqd_invalidate_team_checkout_projection() to service_role;
create trigger invalidate_team_checkout_projection after update on public.mqd_team_master_versions
for each row execute function public.mqd_invalidate_team_checkout_projection();
notify pgrst,'reload schema';
commit;
