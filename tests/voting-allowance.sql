-- All fixture rows are rolled back. No checkout, payment, email, or customer data changes.
begin;
do $$
declare u uuid:=gen_random_uuid(); d1 uuid:=gen_random_uuid(); d2 uuid:=gen_random_uuid(); p uuid; p2 uuid; ord uuid; opt uuid; wrong uuid;
 options jsonb; snap jsonb:='{"zones":{"Front":{"background":"#000000","layers":[]}}}'; blocked boolean;
begin
 insert into auth.users(id,is_anonymous) values(u,false);
 insert into public.customer_designs(id,user_id,product_id,product_name,name,status,design_json)
 values(d1,u,'tshirt','T-Shirt','Option A','draft',jsonb_build_object('design',snap)),(d2,u,'tshirt','T-Shirt','Option B','draft',jsonb_build_object('design',snap));
 options:=jsonb_build_array(jsonb_build_object('design_id',d1,'product_id','tshirt','label','A','preview','data:image/png;base64,AAAA','design_snapshot',snap),jsonb_build_object('design_id',d2,'product_id','tshirt','label','B','preview','data:image/png;base64,AAAA','design_snapshot',snap));
 p:=public.mqd_poll_create(u,'Fixture vote',now()+interval '1 day',options);
 blocked:=false;begin perform public.mqd_poll_create(u,'Blocked',now()+interval '1 day',options);exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL: second free poll';end if;
 select id into opt from public.mqd_poll_options where poll_id=p limit 1;
 if not public.mqd_poll_vote(p,opt,'browser1','network1') then raise exception 'FAIL first vote';end if;
 if public.mqd_poll_vote(p,opt,'browser1','network1') then raise exception 'FAIL duplicate vote';end if;
 if (public.mqd_poll_public(p)->>'total')::int!=1 then raise exception 'FAIL count';end if;
 insert into public.mqd_orders(user_id,product_id,product_name,design_json,status,is_test,created_at)
 values(u,'tshirt','T-Shirt',jsonb_build_object('design',snap),'submitted',false,now()) returning id into ord;
 if public.mqd_poll_unlock(u,p) is not null then raise exception 'FAIL unpaid unlock';end if;
 update public.mqd_orders set stripe_payment_status='paid',paid_at=now(),status='paid',is_test=true where id=ord;
 if public.mqd_poll_unlock(u,p) is not null then raise exception 'FAIL test payment unlock';end if;
 update public.mqd_orders set is_test=false,design_json='{"design":{"zones":{"Front":{"background":"#ffffff"}}}}' where id=ord;
 if public.mqd_poll_unlock(u,p) is not null then raise exception 'FAIL unrelated design unlock';end if;
 update public.mqd_orders set design_json=jsonb_build_object('design',snap) where id=ord;
 if public.mqd_poll_unlock(u,p)!=ord then raise exception 'FAIL paid matching unlock';end if;
 p2:=public.mqd_poll_create(u,'Unlocked',now()+interval '1 day',options);
 if public.mqd_poll_unlock(u,p2) is not null then raise exception 'FAIL payment reused';end if;
 blocked:=false;begin perform public.mqd_poll_create(u,'Blocked again',now()+interval '1 day',options);exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL third poll';end if;
 update public.mqd_polls set closes_at=now()-interval '1 second' where id=p;
 blocked:=false;begin perform public.mqd_poll_vote(p,opt,'browser2','network2');exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL closed vote';end if;
 if public.mqd_poll_public(p)::text like '%design_snapshot%' or public.mqd_poll_public(p)::text like '%user_id%' then raise exception 'FAIL private data exposure';end if;
 if has_table_privilege('anon','public.mqd_polls','SELECT') or has_table_privilege('authenticated','public.mqd_polls','INSERT') or has_function_privilege('anon','public.mqd_poll_create(uuid,text,timestamptz,jsonb)','EXECUTE') then raise exception 'FAIL client bypass';end if;
 raise notice 'PASS: first poll, purchase gating, sandbox rejection, unrelated design rejection, one-time unlock, repeat votes, counts, closing date, private response, client privileges';
end $$;
rollback;
