begin;
-- Derived, private transport cache only. Published versions and source files remain authoritative.
create table public.mqd_team_public_read_cache (
 team_id uuid not null references public.mqd_team_accounts(team_id) on delete cascade,
 revision integer not null,
 garment text not null,
 packet jsonb not null,
 primary key(team_id,revision,garment)
);
alter table public.mqd_team_public_read_cache enable row level security;
revoke all on public.mqd_team_public_read_cache from public,anon,authenticated;
grant select,insert,update,delete on public.mqd_team_public_read_cache to service_role;
alter function public.mqd_read_owner_team_public(text,boolean,text,uuid) rename to mqd_build_owner_team_public;
create function public.mqd_read_owner_team_public(p_slug text,p_live boolean,p_garment text default null,p_version uuid default null)
returns jsonb language plpgsql volatile security invoker set search_path=public as $$
declare a record;b record;packet jsonb;
begin
 -- No artwork columns in the hot-path access check. These values are never cached.
 select team_id,status,billing_status,period_end,organizer_user_id,stripe_subscription_id into a
 from public.mqd_team_accounts where shop_config->>'slug'=p_slug and livemode=p_live and status<>'closed';
 if not found then return null;end if;
 select id,revision,status into b from public.mqd_print_shop_businesses where id=a.team_id;
 if not found or b.status='closed' then return null;end if;
 if p_version is not null then return public.mqd_build_owner_team_public(p_slug,p_live,p_garment,p_version);end if;
 select c.packet into packet from public.mqd_team_public_read_cache c where c.team_id=a.team_id and c.revision=b.revision and c.garment=coalesce(p_garment,'');
 if packet is null then
  packet:=public.mqd_build_owner_team_public(p_slug,p_live,p_garment,null);
  if packet is null then return null;end if;
  if packet->'master'->>'id' is not null then
   insert into public.mqd_team_public_read_cache values(a.team_id,b.revision,coalesce(p_garment,''),packet)
   on conflict(team_id,revision,garment) do nothing;
   delete from public.mqd_team_public_read_cache where team_id=a.team_id and revision<>b.revision;
  end if;
 end if;
 return jsonb_set(packet,'{account}',to_jsonb(a)||jsonb_build_object('shop_config',jsonb_build_object('ownerManaged',true)));
end$$;
revoke all on function public.mqd_read_owner_team_public(text,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.mqd_read_owner_team_public(text,boolean,text,uuid) to service_role;
commit;
