begin;
do $$
declare u uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); d uuid:=gen_random_uuid(); p uuid; up uuid; down uuid; blocked boolean;
snap jsonb:='{"zones":{"Front":{"background":"#FF0000","layers":[{"type":"text","text":"Fixture"}]}}}'; options jsonb; result jsonb;
begin
 insert into auth.users(id,is_anonymous) values(u,false),(stranger,false);
 insert into public.customer_designs(id,user_id,product_id,product_name,name,status,design_json) values(d,u,'tshirt','T-Shirt','Single design','draft',jsonb_build_object('design',snap));
 options:=jsonb_build_array(jsonb_build_object('design_id',d,'product_id','tshirt','label','Thumbs up','preview','data:image/png;base64,AAAA','design_snapshot',snap),jsonb_build_object('design_id',d,'product_id','tshirt','label','Thumbs down','preview','data:image/png;base64,AAAA','design_snapshot',snap));
 perform set_config('role','service_role',true);
 blocked:=false;begin perform public.mqd_poll_create(stranger,'Not owned',now()+interval '1 day',options);exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL owner isolation';end if;
 blocked:=false;begin perform public.mqd_poll_create(u,'Wrong labels',now()+interval '1 day',jsonb_set(options,'{1,label}','"Like"'));exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL feedback label validation';end if;
 p:=public.mqd_poll_create(u,'Do you like this?',now()+interval '1 day',options);
 if (select mode from public.mqd_polls where id=p)!='feedback' then raise exception 'FAIL feedback mode';end if;
 select id into up from public.mqd_poll_options where poll_id=p and label='Thumbs up';
 select id into down from public.mqd_poll_options where poll_id=p and label='Thumbs down';
 if not public.mqd_poll_vote(p,up,'browser-up','network') then raise exception 'FAIL up vote';end if;
 if not public.mqd_poll_vote(p,down,'browser-down','network') then raise exception 'FAIL down vote';end if;
 if public.mqd_poll_vote(p,down,'browser-up','network') then raise exception 'FAIL double vote';end if;
 result:=public.mqd_poll_public(p);
 if result->'poll'->>'mode'!='feedback' or (result->>'total')::int!=2 or (result->'options'->0->>'votes')::int!=1 or (result->'options'->1->>'votes')::int!=1 then raise exception 'FAIL counts';end if;
 result:=public.mqd_poll_results(p);
 if (result->>'total')::int!=2 or result::text like '%design_snapshot%' or result::text like '%user_id%' or result::text like '%voter_hash%' or result::text like '%preview%' then raise exception 'FAIL lightweight result privacy';end if;
 blocked:=false;begin perform public.mqd_poll_create(u,'No extra allowance',now()+interval '1 day',options);exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL allowance preservation';end if;
 update public.mqd_polls set closes_at=now()-interval '1 second' where id=p;
 blocked:=false;begin perform public.mqd_poll_vote(p,up,'new-browser','network');exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL closed vote';end if;
 raise notice 'PASS single-design mode, owner/label validation, thumbs counts, total, duplicate protection, privacy, allowance and closing';
end $$;
rollback;
