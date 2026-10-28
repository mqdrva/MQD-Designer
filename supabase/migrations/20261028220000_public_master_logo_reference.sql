begin;
create or replace function public.mqd_read_team_master_part(p_team uuid,p_product text,p_revision integer,p_part integer)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare d jsonb;r integer;v uuid;t text;n integer;k text;c public.mqd_master_read_cache%rowtype;i integer;
begin
 if p_part is null or p_part<0 or p_part>25 then raise exception 'Invalid master part';end if;
 if p_product is null then select revision into r from public.mqd_team_master_drafts where team_id=p_team;
 else select revision,version_id into r,v from public.mqd_team_garment_master_drafts where team_id=p_team and product_id=p_product;end if;
 if r is null then return null;end if;
 if p_revision is not null and r<>p_revision then raise exception 'Master changed. Reopen the saved draft.';end if;
 k:='draft:'||p_team::text||':'||coalesce(p_product,'primary')||':'||r::text;
 select * into c from public.mqd_master_read_cache where cache_key=k and part=p_part;
 if found then return jsonb_build_object('revision',r,'versionId',v,'parts',c.parts,'text',c.body);end if;
 delete from public.mqd_master_read_cache where cache_key like 'draft:'||p_team::text||':'||coalesce(p_product,'primary')||':%' and cache_key<>k;
 if p_product is null then select draft into d from public.mqd_team_master_drafts where team_id=p_team and revision=r;else select draft into d from public.mqd_team_garment_master_drafts where team_id=p_team and product_id=p_product and revision=r;end if;
 if d is null then raise exception 'Master changed. Reopen the saved draft.';end if;
 t:=d::text;n:=ceil(length(t)::numeric/2097152)::integer;
 for i in 0..n-1 loop insert into public.mqd_master_read_cache values(k,i,substring(t from i*2097152+1 for 2097152),n) on conflict do nothing;end loop;
 if n>26 or p_part>=n then raise exception 'Invalid master part';end if;
 return jsonb_build_object('revision',r,'versionId',v,'parts',n,'text',substring(t from p_part*2097152+1 for 2097152));
end $$;
create or replace function public.mqd_read_owner_team_public_part(p_slug text,p_live boolean,p_garment text default null,p_version uuid default null,p_part integer default 0)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare a public.mqd_team_accounts;b record;m jsonb;p jsonb;product text;version uuid;zone record;layer jsonb;layers jsonb;zones jsonb:='{}';sources text[]:=array[]::text[];source text;i integer;k text;c public.mqd_master_read_cache%rowtype;t text;n integer;j integer;ref jsonb;
begin
 if p_part<0 or p_part>26 then raise exception 'Invalid public master part';end if;
 select * into a from public.mqd_team_accounts where shop_config->>'slug'=p_slug and livemode=p_live and status<>'closed';
 if not found or a.shop_config->>'ownerManaged' is distinct from 'true' then return null;end if;
 if p_part>0 and p_version is not null then
  select * into c from public.mqd_master_read_cache where cache_key='version:'||a.team_id::text||':'||p_version::text and part=p_part;
  if found then return jsonb_build_object('masterChunk',jsonb_build_object('id',p_version,'parts',c.parts,'text',c.body));end if;
 end if;
 select id,status,email_verified_at,shop_config->>'pilotKind' as kind,shop_config->'ownerPublished' as published into b from public.mqd_print_shop_businesses where id=a.team_id;
 if not found then return jsonb_build_object('account',null,'business',null,'master',null);end if;
 p:=b.published;
 product:=coalesce(p_garment,(select key from jsonb_each(p->'shop'->'garments') limit 1));
 version:=coalesce(p_version,coalesce(p->'masterVersionIds'->>product,p->>'masterVersionId')::uuid);
 if version is not null then
  k:='version:'||a.team_id::text||':'||version::text;select * into c from public.mqd_master_read_cache where cache_key=k and part=p_part;
  if not found then
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
   t:=m::text;n:=ceil(length(t)::numeric/2097152)::integer;
   for j in 0..n-1 loop insert into public.mqd_master_read_cache values(k,j,substring(t from j*2097152+1 for 2097152),n) on conflict do nothing;end loop;
   select * into c from public.mqd_master_read_cache where cache_key=k and part=p_part;
  end if;
 end if;
 end if;
 if c.cache_key is not null then
  select body::jsonb into ref from public.mqd_master_read_cache where cache_key=k and part=-1;
  if ref is null then
   select string_agg(body,'' order by part)::jsonb into m from public.mqd_master_read_cache where cache_key=k and part>=0;
   select ordinality-1 into i from jsonb_array_elements_text(m->'sources') with ordinality where value=p->'shop'->>'garmentLogo' limit 1;
   ref:=jsonb_build_object('hash',md5(p->'shop'->>'garmentLogo'),'index',i);
   insert into public.mqd_master_read_cache values(k,-1,ref::text,0) on conflict do nothing;
  end if;
  if ref->>'hash'=md5(p->'shop'->>'garmentLogo') and ref->>'index' is not null then p:=jsonb_set(p,'{shop,garmentLogo}',to_jsonb('master-source:'||(ref->>'index')));end if;
 end if;
 if p_part>0 then return jsonb_build_object('masterChunk',case when c.cache_key is not null then jsonb_build_object('id',version,'parts',c.parts,'text',c.body) else null end);end if;
 return jsonb_build_object(
  'account',jsonb_build_object('team_id',a.team_id,'status',a.status,'billing_status',a.billing_status,'period_end',a.period_end,'organizer_user_id',a.organizer_user_id,'stripe_subscription_id',a.stripe_subscription_id,'shop_config',jsonb_build_object('ownerManaged',true)),
  'business',jsonb_build_object('id',b.id,'status',b.status,'email_verified_at',b.email_verified_at,'shop_config',jsonb_build_object('ownerManaged',true,'pilotKind',b.kind,'ownerPublished',p)),
  'master',null,'masterChunk',case when c.cache_key is not null then jsonb_build_object('id',version,'parts',c.parts,'text',c.body) else null end);
end$$;
create function public.mqd_owner_master_metadata(p_team uuid) returns jsonb language sql stable security invoker set search_path=public set statement_timeout='60s' as $$
 select jsonb_build_object('revision',revision,'product_id',draft->'payload'->'product'->>'id') from public.mqd_team_master_drafts where team_id=p_team;
$$;
revoke all on function public.mqd_owner_master_metadata(uuid) from public,anon,authenticated;
grant execute on function public.mqd_owner_master_metadata(uuid) to service_role;
commit;
