begin;
-- Additional garments only. Existing primary master rows, revisions, versions and
-- account pointers remain intact, including saves from an already open editor.
create table public.mqd_team_garment_master_drafts (
 team_id uuid not null references public.mqd_team_accounts(team_id),
 product_id text not null check(product_id in ('tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie')),
 revision integer not null check(revision>0), draft jsonb not null,
 version_id uuid references public.mqd_team_master_versions(id),
 updated_at timestamptz not null default now(),primary key(team_id,product_id)
);
alter table public.mqd_team_garment_master_drafts enable row level security;
revoke all on public.mqd_team_garment_master_drafts from public,anon,authenticated;
grant select,insert,update on public.mqd_team_garment_master_drafts to service_role;
create function public.mqd_save_owner_garment_master(p_team uuid,p_product text,p_revision integer,p_draft jsonb,p_publish boolean,p_version uuid) returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare d public.mqd_team_garment_master_drafts;primary_product text;begin
 perform 1 from public.mqd_team_accounts a join public.mqd_print_shop_businesses b on b.id=a.team_id where a.team_id=p_team and a.status<>'closed' and b.shop_config->>'ownerManaged'='true' and b.shop_config->>'editingMode'='strict' for update of a;
 if not found then raise exception 'Owner workspace unavailable';end if;
 select draft->'payload'->'product'->>'id' into primary_product from public.mqd_team_master_drafts where team_id=p_team;
 if primary_product=p_product or p_draft->'payload'->'product'->>'id' is distinct from p_product then raise exception 'Garment master mismatch';end if;
 select * into d from public.mqd_team_garment_master_drafts where team_id=p_team and product_id=p_product;
 if coalesce(d.revision,0)<>p_revision then raise exception 'Master changed. Reload before saving.';end if;
 insert into public.mqd_team_garment_master_drafts(team_id,product_id,revision,draft) values(p_team,p_product,p_revision+1,p_draft)
 on conflict(team_id,product_id) do update set revision=excluded.revision,draft=excluded.draft,updated_at=now();
 if p_publish then
 insert into public.mqd_team_master_versions(id,team_id,name,payload,rules) values(p_version,p_team,p_draft->>'name',p_draft->'payload',p_draft->'rules');
 update public.mqd_team_garment_master_drafts set version_id=p_version where team_id=p_team and product_id=p_product;
 end if;
 return jsonb_build_object('revision',p_revision+1,'versionId',case when p_publish then p_version else null end);
end$$;
revoke all on function public.mqd_save_owner_garment_master(uuid,text,integer,jsonb,boolean,uuid) from public,anon,authenticated;
grant execute on function public.mqd_save_owner_garment_master(uuid,text,integer,jsonb,boolean,uuid) to service_role;
commit;
