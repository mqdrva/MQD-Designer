alter table public.mqd_shirt_game_settings add column verified_templates jsonb not null default '{}'::jsonb;
alter table public.mqd_shirt_game_drafts add column production_reviewed boolean not null default false;
alter table public.mqd_shirt_game_drafts add column production_reviewed_by uuid references auth.users(id);
alter table public.mqd_shirt_game_drafts add column production_review_hash text;
-- Creates the ordinary customer design/order/item together so the existing checkout
-- and verified Stripe webhooks can be reused. Disabled until production review passes.
create function public.mqd_shirt_game_prepare_order(p_draft uuid,p_buyer uuid,p_seat integer,p_email text,p_name text,p_unit_cents integer,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.mqd_shirt_game_drafts; oid uuid; did uuid; ref text; pid text; size_text text; qty integer; color text; settings public.mqd_shirt_game_settings;
begin
 if current_user<>'service_role' or p_buyer is null then raise exception 'Service access required';end if;
 select * into settings from public.mqd_shirt_game_settings where id=true;
 if not settings.enabled or not settings.checkout_enabled then raise exception 'Game purchasing is not enabled';end if;
 select * into d from public.mqd_shirt_game_drafts where id=p_draft for update;
 if not found or d.buyer_seat<>p_seat or (d.buyer_id is not null and d.buyer_id<>p_buyer) then raise exception 'Order access denied';end if;
 if coalesce(settings.verified_templates->>(d.snapshot->>'product'),'')<>coalesce(p_payload->>'templateHash','missing') then raise exception 'Garment production proof is required';end if;
 if d.order_id is not null then
  select order_number into ref from public.mqd_orders where id=d.order_id and user_id=p_buyer and status in ('submitted','draft') and is_test=false;
  if ref is null then raise exception 'This order cannot be checked out again';end if;
  return jsonb_build_object('orderNumber',ref,'orderId',d.order_id);
 end if;
 pid:=d.snapshot->>'product';size_text:=d.snapshot->>'size';qty:=(d.snapshot->>'quantity')::integer;color:=d.snapshot->>'color';
 if pid not in ('tshirt','long-sleeve-tshirt','fleece-hoodie') or qty<1 or qty>20 or p_unit_cents<1 or p_unit_cents>100000 then raise exception 'Invalid garment order';end if;
 if p_payload->>'range'<>'shirt-games' or p_payload->>'gameDraftId'<>p_draft::text or length(coalesce(p_payload->>'productionReviewHash',''))<>64 then raise exception 'Invalid production snapshot';end if;
 insert into public.customer_designs(user_id,product_id,product_name,name,status,design_json,zone_colors) values(p_buyer,pid,p_name,'Shirt Games — '||p_name,'draft',p_payload,jsonb_build_object('Front',color,'Back',color)) returning id into did;
 insert into public.mqd_orders(user_id,design_id,status,customer_email,product_id,product_name,product_price,design_json,background_colors,is_test,stripe_payment_status) values(p_buyer,did,'submitted',p_email,pid,p_name,p_unit_cents::numeric/100,p_payload,jsonb_build_object('Front',color,'Back',color),false,'unpaid') returning id,order_number into oid,ref;
 insert into public.mqd_order_items(order_id,design_id,product_id,product_name,unit_price,quantity,order_options) values(oid,did,pid,p_name,p_unit_cents::numeric/100,qty,jsonb_build_array(jsonb_build_object('size',size_text,'quantity',qty)));
 update public.mqd_shirt_game_drafts set buyer_id=p_buyer,order_id=oid,production_reviewed=true,production_review_hash=p_payload->>'productionReviewHash' where id=p_draft;
 return jsonb_build_object('orderNumber',ref,'orderId',oid);
end $$;
revoke all on function public.mqd_shirt_game_prepare_order(uuid,uuid,integer,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.mqd_shirt_game_prepare_order(uuid,uuid,integer,text,text,integer,jsonb) to service_role;

create function public.mqd_shirt_game_verify_product(p_draft uuid,p_admin uuid,p_snapshot_hash text,p_template_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare pid text;
begin
 if current_user<>'service_role' or p_admin is null or length(p_snapshot_hash)<>64 or length(p_template_hash)<>64 then raise exception 'Verified owner access required';end if;
 select snapshot->>'product' into pid from public.mqd_shirt_game_drafts where id=p_draft;
 if pid is null then raise exception 'Proof draft not found';end if;
 update public.mqd_shirt_game_settings set verified_templates=jsonb_set(verified_templates,array[pid],to_jsonb(p_template_hash),true) where id=true;
 update public.mqd_shirt_game_drafts set production_reviewed=true,production_reviewed_by=p_admin,production_review_hash=p_snapshot_hash where id=p_draft;
 return true;
end $$;
revoke all on function public.mqd_shirt_game_verify_product(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.mqd_shirt_game_verify_product(uuid,uuid,text,text) to service_role;
