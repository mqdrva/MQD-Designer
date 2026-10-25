begin;
-- One atomic, server-only copy. Saved artwork remains byte-for-byte JSON data;
-- no published versions, customer data, billing identity or access is inherited.
create function public.mqd_duplicate_owner_team(p_source uuid,p_target uuid,p_revision integer,p_name text,p_slug text,p_actor uuid,p_live boolean)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare source public.mqd_print_shop_businesses;existing public.mqd_print_shop_businesses;shop jsonb;fingerprint text;copied integer;extra integer;
begin
 if p_source is null or p_target is null or p_source=p_target or p_actor is null or p_revision is null
 or p_name is null or length(trim(p_name)) not between 2 and 80
 or p_slug is null or length(p_slug) not between 3 and 48 or p_slug in ('pilot','admin','setup','support','help') or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Enter a new team name and link name';end if;
 fingerprint:='owner-copy:'||p_source||':'||p_revision||':'||md5(trim(p_name)||':'||p_slug);
 -- Serializes retries and protects against two concurrent requests for one link.
 perform pg_advisory_xact_lock(hashtextextended('owner-copy:'||p_target,0));
 perform pg_advisory_xact_lock(hashtextextended('owner-copy-slug:'||p_slug,0));
 select * into existing from public.mqd_print_shop_businesses where id=p_target;
 if found then
  if existing.payload_hash is distinct from fingerprint or existing.ip_hash is distinct from 'owner:'||p_actor then raise exception 'Destination already exists. Start a new copy.';end if;
  return jsonb_build_object('id',p_target,'revision',existing.revision,'recovered',true);
 end if;
 -- Same lock order as master saves: account, then setup. Drafts cannot change
 -- while their snapshot is copied. Unsaved browser edits are never included.
 perform 1 from public.mqd_team_accounts where team_id=p_source and status<>'closed' for update;
 if not found then raise exception 'Source owner workspace unavailable';end if;
 select * into source from public.mqd_print_shop_businesses where id=p_source for update;
 if not found or source.status='closed' or source.shop_config->>'ownerManaged' is distinct from 'true' then raise exception 'Source owner workspace unavailable';end if;
 if source.revision<>p_revision then raise exception 'Source setup changed. Reopen it before duplicating.';end if;
 if exists(select 1 from public.mqd_print_shop_businesses where preferred_slug=p_slug and status<>'closed') then raise exception 'This link name is already reserved. Choose another.';end if;
 -- Explicit allowlist excludes existing permissions, contacts and publication.
 select jsonb_object_agg(key,value) into shop from jsonb_each(source.shop_config)
 where key in ('name','slug','logo','garmentLogo','tagline','requirements','garments','engines','pricing','printMethods','printMethods3d','productNames','organizationType','fulfillmentMode','pilot','teamEnvironment','pilotKind','editingMode');
 shop:=shop||jsonb_build_object('name',trim(p_name),'slug',p_slug,'ownerManaged',true,'ownerRequest',jsonb_build_object('designRequest','','referenceUrl',''),'organizerAccess',jsonb_build_object('enabled',false,'rewardQuantity',5));
 insert into public.mqd_print_shop_businesses(id,preferred_slug,plan,owner_email,owner_phone,shop_config,payload_hash,ip_hash,mail_origin,token_hash,token_cipher,token_expires_at,status,revision)
 values(p_target,p_slug,'3d','','',shop,fingerprint,'owner:'||p_actor,source.mail_origin,gen_random_uuid()::text||gen_random_uuid()::text,'{}',now(),'pending_review',1);
 insert into public.mqd_team_accounts(team_id,shop_config,livemode,status,billing_status) values(p_target,shop,p_live,'awaiting_review','not_configured');
 insert into public.mqd_team_master_drafts(team_id,revision,draft)
 select p_target,1,draft from public.mqd_team_master_drafts where team_id=p_source;
 get diagnostics copied=row_count;
 insert into public.mqd_team_garment_master_drafts(team_id,product_id,revision,draft)
 select p_target,product_id,1,draft from public.mqd_team_garment_master_drafts where team_id=p_source;
 get diagnostics extra=row_count;
 return jsonb_build_object('id',p_target,'revision',1,'copiedDrafts',copied+extra,'recovered',false);
end$$;
revoke all on function public.mqd_duplicate_owner_team(uuid,uuid,integer,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.mqd_duplicate_owner_team(uuid,uuid,integer,text,text,uuid,boolean) to service_role;
notify pgrst,'reload schema';
commit;
