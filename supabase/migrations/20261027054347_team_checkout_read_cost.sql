begin;
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
  select status,shop_config into biz from public.mqd_print_shop_businesses where id=a.team_id;
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
-- Build small layer projections first; never rewrite the entire artwork JSON per layer.
create or replace function public.mqd_team_checkout_master(p_team uuid,p_version uuid)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare v public.mqd_team_master_versions;zone record;layer jsonb;layers jsonb;zones jsonb:='{}';source text;payload jsonb;
begin
 select * into v from public.mqd_team_master_versions where team_id=p_team and id=p_version;
 if not found then return null;end if;
 payload:=v.payload;
 for zone in select key,value from jsonb_each(payload->'design'->'zones') loop
  layers:='[]';
  for layer in select value from jsonb_array_elements(zone.value->'layers') loop
   if layer->>'type'='image' then
    source:=layer->>'src';
    if source is null or left(source,40) !~ '^data:image/(png|jpeg|webp);base64,' then raise exception 'Master original source unavailable';end if;
    layer:=(layer-'src')||jsonb_build_object('src','sha256:'||encode(sha256(convert_to(source,'UTF8')),'hex'));
   end if;
   layers:=layers||jsonb_build_array(layer);
  end loop;
  zones:=zones||jsonb_build_object(zone.key,(zone.value-'layers')||jsonb_build_object('layers',layers));
 end loop;
 v.payload:=jsonb_set(payload,'{design,zones}',zones);
 return to_jsonb(v);
end$$;
revoke all on function public.mqd_team_checkout_master(uuid,uuid) from public,anon,authenticated;
grant execute on function public.mqd_team_checkout_master(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
