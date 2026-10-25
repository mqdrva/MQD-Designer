begin;
-- Publish already validated private drafts inside one transaction. Original bytes
-- never travel back through the browser, and publishing does not increment draft revisions.
create function public.mqd_publish_owner_saved_masters(p_team uuid,p_revision integer,p_expected jsonb,p_public_shop jsonb,p_waive boolean,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare b public.mqd_print_shop_businesses;a public.mqd_team_accounts;d jsonb;r integer;product text;primary_product text;v uuid;versions jsonb:='{}';published jsonb;
begin
 select * into a from public.mqd_team_accounts where team_id=p_team and status<>'closed' for update;
 if not found then raise exception 'Team unavailable';end if;
 select * into b from public.mqd_print_shop_businesses where id=p_team and status<>'closed' for update;
 if not found or b.shop_config->>'ownerManaged' is distinct from 'true' or b.shop_config->>'editingMode' is distinct from 'strict' then raise exception 'Owner strict workspace required';end if;
 if b.revision<>p_revision then raise exception 'Workspace changed. Reload before publishing.';end if;
 if p_waive and b.shop_config->>'pilotKind' is distinct from 'team' then raise exception 'Free organizer access is for Teams only';end if;
 if p_actor is null or p_waive is null or jsonb_typeof(p_expected) is distinct from 'object' or jsonb_typeof(p_public_shop->'garments') is distinct from 'object' or p_public_shop->'garments' is distinct from b.shop_config->'garments' then raise exception 'Confirm the saved setup before publishing';end if;
 select draft->'payload'->'product'->>'id' into primary_product from public.mqd_team_master_drafts where team_id=p_team;
 for product in select jsonb_object_keys(b.shop_config->'garments') loop
  d:=null;r:=null;
  if product=primary_product then select draft,revision into d,r from public.mqd_team_master_drafts where team_id=p_team;
  else select draft,revision into d,r from public.mqd_team_garment_master_drafts where team_id=p_team and product_id=product;end if;
  if d is null or r is distinct from (p_expected->>product)::integer or d->'payload'->'product'->>'id' is distinct from product then raise exception 'Saved master changed. Reopen before publishing.';end if;
  v:=gen_random_uuid();
  insert into public.mqd_team_master_versions(id,team_id,name,payload,rules) values(v,p_team,d->>'name',d->'payload',d->'rules');
  versions:=versions||jsonb_build_object(product,v);
  if product=primary_product then update public.mqd_team_accounts set master_version_id=v where team_id=p_team;
  else update public.mqd_team_garment_master_drafts set version_id=v where team_id=p_team and product_id=product;end if;
 end loop;
 if versions='{}' then raise exception 'Select a saved garment first';end if;
 published:=jsonb_build_object('shop',p_public_shop,'masterVersionIds',versions,'masterVersionId',versions->primary_product,'publishedAt',now(),'organizerFeeWaived',p_waive,'authorizedBy',p_actor);
 update public.mqd_print_shop_businesses set shop_config=jsonb_set(shop_config,'{ownerPublished}',published),revision=revision+1,updated_at=now() where id=p_team;
 return jsonb_build_object('revision',p_revision+1,'masterVersionIds',versions);
end$$;
revoke all on function public.mqd_publish_owner_saved_masters(uuid,integer,jsonb,jsonb,boolean,uuid) from public,anon,authenticated;
grant execute on function public.mqd_publish_owner_saved_masters(uuid,integer,jsonb,jsonb,boolean,uuid) to service_role;
CREATE OR REPLACE FUNCTION public.mqd_reserve_team_order(p_order jsonb)
 RETURNS mqd_team_orders
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare b public.mqd_team_batches;r public.mqd_team_orders;q integer;used integer;
begin
 select * into r from public.mqd_team_orders where id=(p_order->>'id')::uuid;
 if found then if r.request_hash<>p_order->>'request_hash' or r.guest_token_hash<>p_order->>'guest_token_hash' then raise exception 'Order retry does not match';end if;return r;end if;
 perform 1 from public.mqd_team_accounts a where a.team_id=(p_order->>'team_id')::uuid and a.livemode=coalesce((p_order->>'livemode')::boolean,false) and a.status<>'closed' and (
 (a.status='active' and a.billing_status='active' and a.period_end>now() and coalesce(a.shop_config->>'ownerManaged','false')<>'true')
 or (p_order->>'delivery'='individual' and a.shop_config->>'ownerManaged'='true' and exists (
 select 1 from public.mqd_print_shop_businesses biz where biz.id=a.team_id and biz.status<>'closed'
 and biz.shop_config->>'ownerManaged'='true' and biz.shop_config->>'pilotKind'='team'
 and biz.shop_config->'ownerPublished'->>'organizerFeeWaived'='true'
 and biz.shop_config->'ownerPublished'->>'authorizedBy' is not null
 and biz.shop_config->'ownerPublished'->'shop'->'garments' ? (p_order->'summary'->>'productId')
 and exists(select 1 from public.mqd_team_master_versions v where v.id=(p_order->'summary'->'master'->>'versionId')::uuid and v.team_id=a.team_id and v.payload->'product'->>'id'=p_order->'summary'->>'productId')
 ))) for update;if not found then raise exception 'Team subscription is inactive';end if;
 q:=(p_order->>'quantity')::integer;
 if p_order->>'delivery'='team' then
  select * into b from public.mqd_team_batches where id=(p_order->>'batch_id')::uuid and team_id=(p_order->>'team_id')::uuid for update;
  if not found or b.status<>'open' or b.shipping_paid_at is null or b.shipping_refunded or b.approved_at is null or b.cutoff_at<=now() or b.opens_at>now() then raise exception 'Team batch is closed';end if;
  select coalesce(sum(quantity),0) into used from public.mqd_team_orders where batch_id=b.id and (payment_status in ('paid','pending') or reserved_until>now());
  if used+q>b.max_quantity then raise exception 'This batch is full. Choose individual shipping or a new batch.';end if;
 end if;
 insert into public.mqd_team_orders(id,team_id,batch_id,request_hash,ip_hash,guest_token_hash,customer,summary,delivery,quantity,garment_cents,shipping_cents,package_path,livemode,reserved_until)
 values((p_order->>'id')::uuid,(p_order->>'team_id')::uuid,(p_order->>'batch_id')::uuid,p_order->>'request_hash',p_order->>'ip_hash',p_order->>'guest_token_hash',p_order->'customer',p_order->'summary',p_order->>'delivery',(p_order->>'quantity')::integer,(p_order->>'garment_cents')::integer,(p_order->>'shipping_cents')::integer,p_order->>'package_path',coalesce((p_order->>'livemode')::boolean,false),now()+interval '40 minutes') returning * into r;return r;
end $function$;

revoke all on function public.mqd_reserve_team_order(jsonb) from public,anon,authenticated;
grant execute on function public.mqd_reserve_team_order(jsonb) to service_role;
notify pgrst,'reload schema';
commit;
