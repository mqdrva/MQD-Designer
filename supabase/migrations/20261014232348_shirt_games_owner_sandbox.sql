-- Owner-only sandbox orders are isolated from customer drafts and paid production.
alter table public.mqd_shirt_game_drafts add column is_test boolean not null default false;
alter table public.mqd_shirt_game_drafts add column test_source_id uuid references public.mqd_shirt_game_drafts(id);
create index mqd_shirt_game_test_owner_idx on public.mqd_shirt_game_drafts(buyer_id,created_at desc) where is_test;

create function public.mqd_shirt_game_prepare_sandbox(p_source uuid,p_test uuid,p_admin uuid,p_design uuid,p_guest_hash text,p_name text,p_unit_cents integer,p_snapshot jsonb,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.mqd_shirt_game_drafts; oid uuid; ref text; pid text; qty integer; size_text text; color text;
begin
 if current_user<>'service_role' or p_admin is null then raise exception 'Verified owner service required';end if;
 if not exists(select 1 from auth.users where id=p_admin and raw_app_meta_data->>'role'='admin') then raise exception 'Owner account required';end if;
 perform 1 from public.mqd_shirt_game_settings where id=true for update;
 if (select count(*) from public.mqd_shirt_game_drafts where is_test and buyer_id=p_admin and created_at>now()-interval '1 day')>=5 then raise exception 'Daily owner sandbox limit reached';end if;
 select * into d from public.mqd_shirt_game_drafts where id=p_source and not is_test;
 if not found or d.snapshot->'snapshot'->>'status'<>'revealed' or coalesce(d.snapshot->'snapshot'->>'approved','false')<>'true' then raise exception 'Approved game draft required';end if;
 if (p_snapshot-array['id','reference','isTest']) is distinct from (d.snapshot-array['id','reference','isTest']) then raise exception 'Sandbox snapshot must preserve the approved design';end if;
 if p_snapshot->>'id'<>p_test::text or p_snapshot->>'isTest'<>'true' or p_payload->>'gameDraftId'<>p_test::text or p_payload->>'testMode'<>'true' or p_payload->>'range'<>'shirt-games' then raise exception 'Explicit sandbox snapshot required';end if;
 if p_guest_hash !~ '^[a-f0-9]{64}$' or p_unit_cents<1 or p_unit_cents>100000 then raise exception 'Invalid sandbox order';end if;
 if not exists(select 1 from public.customer_designs where id=p_design and user_id=p_admin and design_json->>'testMode'='true') then raise exception 'Save the sandbox design in the verified owner account first';end if;
 pid:=d.snapshot->>'product';qty:=(d.snapshot->>'quantity')::integer;size_text:=d.snapshot->>'size';color:=d.snapshot->>'color';
 if pid not in ('tshirt','long-sleeve-tshirt','fleece-hoodie') or qty<1 or qty>20 then raise exception 'Invalid sandbox garment';end if;
 insert into public.mqd_orders(user_id,design_id,status,product_id,product_name,product_price,design_json,background_colors,is_test,stripe_payment_status,guest_checkout_token_hash)
 values(null,p_design,'submitted',pid,p_name,p_unit_cents::numeric/100,p_payload,jsonb_build_object('Front',color,'Back',color),true,'unpaid',p_guest_hash) returning id,order_number into oid,ref;
 insert into public.mqd_order_items(order_id,design_id,product_id,product_name,unit_price,quantity,order_options)
 values(oid,p_design,pid,p_name,p_unit_cents::numeric/100,qty,jsonb_build_array(jsonb_build_object('size',size_text,'quantity',qty)));
 insert into public.mqd_shirt_game_drafts(id,game_id,buyer_seat,buyer_id,snapshot,order_id,is_test,test_source_id)
 values(p_test,d.game_id,d.buyer_seat,p_admin,p_snapshot,oid,true,p_source);
 return jsonb_build_object('orderNumber',ref,'orderId',oid,'draftId',p_test);
end $$;
revoke all on function public.mqd_shirt_game_prepare_sandbox(uuid,uuid,uuid,uuid,text,text,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.mqd_shirt_game_prepare_sandbox(uuid,uuid,uuid,uuid,text,text,integer,jsonb,jsonb) to service_role;
