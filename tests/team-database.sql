begin;
do $$
declare tid uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';bid uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01';oid uuid:='cccccccc-cccc-4ccc-8ccc-cccccccccc01';r public.mqd_team_orders;account public.mqd_team_accounts;payload jsonb;failed boolean:=false;n integer;
begin
 if has_table_privilege('anon','public.mqd_team_orders','select') or has_table_privilege('authenticated','public.mqd_team_orders','select') or has_function_privilege('anon','public.mqd_reserve_team_order(jsonb)','execute') then raise exception 'Team privacy grants failed';end if;
 if exists(select 1 from pg_tables where schemaname='public' and tablename like 'mqd_team_%' and not rowsecurity) then raise exception 'Team RLS missing';end if;
 insert into public.mqd_print_shop_businesses(id,preferred_slug,plan,owner_email,owner_phone,shop_config,payload_hash,ip_hash,mail_origin,token_hash,token_cipher,token_expires_at,email_verified_at) values(tid,'team-rollback-verification','3d','fixture@example.com','2025550101','{"organizationType":"team","fulfillmentMode":"mymerchnow","name":"Rollback fixture"}',repeat('0',64),repeat('0',64),'http://localhost',repeat('0',64),'{}',now()+interval '1 day',now());
 select * into account from public.mqd_approve_team(tid,1,'{"organizationType":"team","fulfillmentMode":"mymerchnow","name":"Rollback fixture"}');
 if account.status<>'ready' then raise exception 'Approval must not grant paid access';end if;
 begin perform public.mqd_approve_team(tid,1,'{"organizationType":"team","fulfillmentMode":"mymerchnow"}');exception when others then failed:=true;end;if not failed then raise exception 'Stale approval was accepted';end if;
 update public.mqd_team_accounts set status='active',billing_status='active',period_start=now(),period_end=now()+interval '30 days' where team_id=tid;
 insert into public.mqd_team_batches(id,team_id,status,days,expected_quantity,max_quantity,shipping_address,shipping_paid_at,approved_at,opens_at,cutoff_at) values(bid,tid,'open',7,30,30,'{}',now(),now(),now(),now()+interval '7 days');
 payload:=jsonb_build_object('id',oid,'team_id',tid,'batch_id',bid,'request_hash','fixture-hash','ip_hash','fixture-ip','guest_token_hash','fixture-guest','customer','{}'::jsonb,'summary','{}'::jsonb,'delivery','team','quantity',25,'garment_cents',50000,'shipping_cents',0,'package_path','fixture.zip');
 select * into r from public.mqd_reserve_team_order(payload);if r.quantity<>25 then raise exception 'Reservation failed';end if;
 perform public.mqd_reserve_team_order(payload);select count(*) into n from public.mqd_team_orders where team_id=tid;if n<>1 then raise exception 'Retry duplicated order';end if;
 failed:=false;begin perform public.mqd_reserve_team_order(payload||jsonb_build_object('id','cccccccc-cccc-4ccc-8ccc-cccccccccc02','quantity',6));exception when others then failed:=true;end;if not failed then raise exception 'Batch capacity exceeded';end if;
 failed:=false;begin perform public.mqd_reserve_team_order(payload||jsonb_build_object('guest_token_hash','another-guest'));exception when others then failed:=true;end;if not failed then raise exception 'Guest ownership bypass';end if;
 update public.mqd_team_orders set payment_status='paid',production_status='batch_waiting',paid_at=now() where id=oid;
 update public.mqd_team_batches set opens_at=now()-interval '8 days',cutoff_at=now()-interval '1 day' where id=bid;
 perform public.mqd_close_team_batches();if (select status from public.mqd_team_batches where id=bid)<>'closed' or (select production_status from public.mqd_team_orders where id=oid)<>'ready' then raise exception 'Cutoff failed to close/promote paid batch';end if;
 failed:=false;begin perform public.mqd_reserve_team_order(payload||jsonb_build_object('id','cccccccc-cccc-4ccc-8ccc-cccccccccc03','quantity',1));exception when others then failed:=true;end;if not failed then raise exception 'Closed batch accepted an order';end if;
 update public.mqd_team_accounts set billing_status='past_due' where team_id=tid;
 failed:=false;begin perform public.mqd_reserve_team_order(payload||jsonb_build_object('id','cccccccc-cccc-4ccc-8ccc-cccccccccc04','delivery','individual','batch_id',null,'shipping_cents',1000,'quantity',1));exception when others then failed:=true;end;if not failed then raise exception 'Unpaid subscription allowed checkout';end if;
end $$;
select 'Team SQL checks passed: RLS, privileges, approved-versus-paid access, revisions, capacity, guest ownership, idempotency and automatic cutoff.' as verification;
rollback;
