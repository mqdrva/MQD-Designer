begin;
alter table public.mqd_team_accounts add column organizer_user_id uuid;
alter table public.mqd_team_accounts add column reward_quantity integer check(reward_quantity between 1 and 500);
-- Service-only binding after the API validates the signed-in verified organizer.
-- Lock both rows so an owner contact/permission change cannot race enrollment.
create function public.mqd_bind_owner_organizer(p_team uuid,p_user uuid,p_email text,p_quantity integer,p_policy text)
returns public.mqd_team_accounts language plpgsql security invoker set search_path=public as $$
declare a public.mqd_team_accounts;b public.mqd_print_shop_businesses;
begin
 select * into a from public.mqd_team_accounts where team_id=p_team for update;
 if not found or a.status='closed' then raise exception 'Team unavailable';end if;
 select * into b from public.mqd_print_shop_businesses where id=p_team for update;
 if not found or b.status='closed' or b.shop_config->>'ownerManaged' is distinct from 'true'
 or b.shop_config->>'pilotKind' is distinct from 'team'
 or b.shop_config->'organizerAccess'->>'enabled' is distinct from 'true'
 or b.shop_config->'ownerPublished'->'masterVersionIds' is null
 or p_user is null or lower(p_email) is distinct from lower(b.owner_email)
 or p_policy is distinct from '2026-10-25-owner'
 or p_quantity is distinct from coalesce((b.shop_config->'organizerAccess'->>'rewardQuantity')::integer,5)
 then raise exception 'Organizer signup is not authorized';end if;
 if a.organizer_user_id is not null and (a.organizer_user_id<>p_user or a.reward_quantity<>p_quantity) then raise exception 'Organizer signup is already bound';end if;
 update public.mqd_team_accounts set organizer_user_id=p_user,reward_quantity=p_quantity where team_id=p_team returning * into a;
 return a;
end$$;
revoke all on function public.mqd_bind_owner_organizer(uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.mqd_bind_owner_organizer(uuid,uuid,text,integer,text) to service_role;
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
 and ((a.organizer_user_id is not null and a.stripe_subscription_id is not null and a.status='active' and a.billing_status='active' and a.period_end>now()) or ((a.organizer_user_id is null or a.stripe_subscription_id is null) and biz.shop_config->'ownerPublished'->>'organizerFeeWaived'='true'))
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
