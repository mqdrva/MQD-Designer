begin;
create table if not exists public.mqd_team_master_drafts (
 team_id uuid primary key references public.mqd_team_accounts(team_id),
 revision integer not null default 1, draft jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.mqd_team_master_versions (
 id uuid primary key, team_id uuid not null references public.mqd_team_accounts(team_id),
 name text not null, payload jsonb not null, rules jsonb not null, created_at timestamptz not null default now()
);
alter table public.mqd_team_accounts add column if not exists master_version_id uuid references public.mqd_team_master_versions(id);
alter table public.mqd_team_master_drafts enable row level security;
alter table public.mqd_team_master_versions enable row level security;
revoke all on public.mqd_team_master_drafts,public.mqd_team_master_versions from public,anon,authenticated;
grant select,insert,update on public.mqd_team_master_drafts to service_role;
grant select,insert on public.mqd_team_master_versions to service_role;
create or replace function public.mqd_team_master_immutable() returns trigger language plpgsql set search_path=public as $$begin raise exception 'Published team masters are immutable';end$$;
drop trigger if exists mqd_team_master_immutable on public.mqd_team_master_versions;
create trigger mqd_team_master_immutable before update or delete on public.mqd_team_master_versions for each row execute function public.mqd_team_master_immutable();
create or replace function public.mqd_save_team_master(p_team uuid,p_revision integer,p_draft jsonb,p_publish boolean,p_version uuid) returns jsonb language plpgsql security invoker set search_path=public as $$
declare d public.mqd_team_master_drafts;begin
 perform 1 from public.mqd_team_accounts where team_id=p_team and status<>'closed' for update;
 if not found then raise exception 'Team unavailable';end if;
 select * into d from public.mqd_team_master_drafts where team_id=p_team;
 if coalesce(d.revision,0)<>p_revision then raise exception 'Master changed. Reload before saving.';end if;
 insert into public.mqd_team_master_drafts(team_id,revision,draft) values(p_team,p_revision+1,p_draft)
 on conflict(team_id) do update set revision=excluded.revision,draft=excluded.draft,updated_at=now();
 if p_publish then
 insert into public.mqd_team_master_versions(id,team_id,name,payload,rules) values(p_version,p_team,p_draft->>'name',p_draft->'payload',p_draft->'rules');
 update public.mqd_team_accounts set master_version_id=p_version where team_id=p_team;
 end if;
 return jsonb_build_object('revision',p_revision+1,'versionId',case when p_publish then p_version else null end);
end$$;
revoke all on function public.mqd_team_master_immutable(),public.mqd_save_team_master(uuid,integer,jsonb,boolean,uuid) from public,anon,authenticated;
grant execute on function public.mqd_save_team_master(uuid,integer,jsonb,boolean,uuid) to service_role;
update storage.buckets set file_size_limit=52428800 where id='mqd-team-production';
commit;
