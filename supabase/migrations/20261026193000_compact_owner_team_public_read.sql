begin;
-- Service-only read projection. No cached access decisions, no stored design changes.
-- Deduplicate originals inside Postgres before they cross the database/edge boundary.
create function public.mqd_read_owner_team_public(p_slug text,p_live boolean,p_garment text default null,p_version uuid default null)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare a public.mqd_team_accounts;b record;m jsonb;p jsonb;product text;version uuid;zone record;layer jsonb;layers jsonb;zones jsonb:='{}';sources text[]:=array[]::text[];source text;i integer;
begin
 select * into a from public.mqd_team_accounts where shop_config->>'slug'=p_slug and livemode=p_live and status<>'closed';
 if not found or a.shop_config->>'ownerManaged' is distinct from 'true' then return null;end if;
 select id,status,email_verified_at,shop_config->>'pilotKind' as kind,shop_config->'ownerPublished' as published into b from public.mqd_print_shop_businesses where id=a.team_id;
 if not found then return jsonb_build_object('account',null,'business',null,'master',null);end if;
 p:=b.published;
 product:=coalesce(p_garment,(select key from jsonb_each(p->'shop'->'garments') limit 1));
 version:=coalesce(p_version,coalesce(p->'masterVersionIds'->>product,p->>'masterVersionId')::uuid);
 if version is not null then
  select to_jsonb(v) into m from public.mqd_team_master_versions v where id=version and team_id=a.team_id;
  if m is not null then
   for zone in select key,value from jsonb_each(m->'payload'->'design'->'zones') loop
    layers:='[]';
    for layer in select value from jsonb_array_elements(zone.value->'layers') loop
     if layer->>'type'='image' then
      source:=layer->>'src';i:=array_position(sources,source);
      if i is null then sources:=array_append(sources,source);i:=array_length(sources,1);end if;
      layer:=jsonb_set(layer,'{src}',to_jsonb('source:'||(i-1)::text));
     end if;
     layers:=layers||jsonb_build_array(layer);
    end loop;
    zones:=zones||jsonb_build_object(zone.key,jsonb_set(zone.value,'{layers}',layers));
   end loop;
   m:=jsonb_set(m,'{payload,design,zones}',zones)||jsonb_build_object('sourceFormat','mqd-master-sources-v1','sources',to_jsonb(sources));
   i:=array_position(sources,p->'shop'->>'garmentLogo');
   if i is not null then p:=jsonb_set(p,'{shop,garmentLogo}',to_jsonb('master-source:'||(i-1)::text));end if;
  end if;
 end if;
 return jsonb_build_object(
  'account',jsonb_build_object('team_id',a.team_id,'status',a.status,'billing_status',a.billing_status,'period_end',a.period_end,'organizer_user_id',a.organizer_user_id,'stripe_subscription_id',a.stripe_subscription_id,'shop_config',jsonb_build_object('ownerManaged',true)),
  'business',jsonb_build_object('id',b.id,'status',b.status,'email_verified_at',b.email_verified_at,'shop_config',jsonb_build_object('ownerManaged',true,'pilotKind',b.kind,'ownerPublished',p)),
  'master',m);
end$$;
revoke all on function public.mqd_read_owner_team_public(text,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.mqd_read_owner_team_public(text,boolean,text,uuid) to service_role;
commit;
