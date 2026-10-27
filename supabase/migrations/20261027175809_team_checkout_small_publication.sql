begin;
-- A private, invalidated projection of publication metadata; originals remain authoritative.
alter table public.mqd_print_shop_businesses add column checkout_projection_key uuid not null default gen_random_uuid();
create table public.mqd_team_checkout_business_cache (
 team_id uuid references public.mqd_print_shop_businesses(id) on delete cascade,
 generation uuid not null,
 projection jsonb not null,
 primary key(team_id,generation)
);
alter table public.mqd_team_checkout_business_cache enable row level security;
revoke all on public.mqd_team_checkout_business_cache from public,anon,authenticated;
grant select,insert,delete on public.mqd_team_checkout_business_cache to service_role;
create function public.mqd_clear_team_checkout_business_cache() returns trigger language plpgsql security invoker set search_path=public as $$
begin delete from public.mqd_team_checkout_business_cache where team_id=new.id;new.checkout_projection_key:=gen_random_uuid();return new;end$$;
revoke all on function public.mqd_clear_team_checkout_business_cache() from public,anon,authenticated;
create trigger mqd_clear_team_checkout_business_cache before update on public.mqd_print_shop_businesses for each row execute function public.mqd_clear_team_checkout_business_cache();
create or replace function public.mqd_team_checkout_business(p_team uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare b record;c record;p record;result jsonb;shop jsonb;
begin
 select cache.projection into result from public.mqd_team_checkout_business_cache cache join public.mqd_print_shop_businesses business on business.id=cache.team_id and business.checkout_projection_key=cache.generation where cache.team_id=p_team;
 if found then return result;end if;
 select status,shop_config,checkout_projection_key into b from public.mqd_print_shop_businesses where id=p_team;
 if not found then return null;end if;
 select * into c from jsonb_to_record(b.shop_config) as x("ownerManaged" jsonb,"pilotKind" text,"ownerPublished" jsonb);
 select * into p from jsonb_to_record(coalesce(c."ownerPublished",'{}')) as x(shop jsonb,"authorizedBy" text,"masterVersionIds" jsonb,"organizerFeeWaived" jsonb);
 shop:=p.shop-'logo';
 -- The separate garment logo is only required in flexible logo modes. A strict
 -- master carries its verified originals in the purchased package already.
 if not exists(select 1 from jsonb_each(shop->'garments') g where coalesce(g.value->'logoPreset'->>'mode','none')<>'none') then shop:=shop-'garmentLogo';end if;
 result:=jsonb_build_object('status',b.status,'owner_managed',c."ownerManaged",'pilot_kind',c."pilotKind",'published_shop',shop,'publication_authorized_by',p."authorizedBy",'publication_master_ids',p."masterVersionIds",'publication_waived',p."organizerFeeWaived");
 -- Do not cache absent publications; all existing cache entries are invalidated
 -- transactionally on any setup/status update, including unpublish.
 if p.shop is not null then insert into public.mqd_team_checkout_business_cache values(p_team,b.checkout_projection_key,result) on conflict do nothing;end if;
 return result;
end$$;
revoke all on function public.mqd_team_checkout_business(uuid) from public,anon,authenticated;
grant execute on function public.mqd_team_checkout_business(uuid) to service_role;
CREATE OR REPLACE FUNCTION public.mqd_reserve_team_order(p_order jsonb)
 RETURNS mqd_team_orders
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare b public.mqd_team_batches;r public.mqd_team_orders;q integer;used integer;a record;biz record;cfg record;pub record;allowed boolean:=false;
begin
 select * into r from public.mqd_team_orders where id=(p_order->>'id')::uuid;
 if found then if r.request_hash<>p_order->>'request_hash' or r.guest_token_hash<>p_order->>'guest_token_hash' then raise exception 'Order retry does not match';end if;return r;end if;
 -- Lock current account state, then decode each large configuration once.
 select team_id,status,billing_status,period_end,organizer_user_id,stripe_subscription_id,
 shop_config->>'ownerManaged' as owner_managed into a
 from public.mqd_team_accounts where team_id=(p_order->>'team_id')::uuid
 and livemode=coalesce((p_order->>'livemode')::boolean,false) and status<>'closed' for update;
 if not found then raise exception 'Team subscription is inactive';end if;
 if coalesce(a.owner_managed,'false')<>'true' then
  allowed:=a.status='active' and a.billing_status='active' and a.period_end>now();
 elsif p_order->>'delivery'='individual' then
  select r->>'status' as status,jsonb_build_object('ownerManaged',r->'owner_managed','pilotKind',r->'pilot_kind','ownerPublished',jsonb_build_object('organizerFeeWaived',r->'publication_waived','authorizedBy',r->'publication_authorized_by','shop',r->'published_shop')) as shop_config into biz
  from (select public.mqd_team_checkout_business(a.team_id) as r) projection where r is not null;
  if found and biz.status<>'closed' then
   select * into cfg from jsonb_to_record(biz.shop_config) as x("ownerManaged" text,"pilotKind" text,"ownerPublished" jsonb);
   select * into pub from jsonb_to_record(coalesce(cfg."ownerPublished",'{}')) as x("organizerFeeWaived" text,"authorizedBy" text,shop jsonb);
   allowed:=cfg."ownerManaged"='true' and cfg."pilotKind"='team' and pub."organizerFeeWaived"='true'
    and pub."authorizedBy" is not null and pub.shop->'garments' ? (p_order->'summary'->>'productId')
    and ((a.organizer_user_id is not null and a.stripe_subscription_id is not null and a.status='active' and a.billing_status='active' and a.period_end>now())
      or a.organizer_user_id is null or a.stripe_subscription_id is null)
    and exists(select 1 from public.mqd_team_master_versions v where v.id=(p_order->'summary'->'master'->>'versionId')::uuid and v.team_id=a.team_id and v.payload->'product'->>'id'=p_order->'summary'->>'productId');
  end if;
 end if;
 if allowed is not true then raise exception 'Team subscription is inactive';end if;
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
