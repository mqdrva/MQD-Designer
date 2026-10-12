-- Disposable fixtures, rolled back; no real customer data or public contests.
begin;
do $$
declare u uuid:=gen_random_uuid(); c uuid; opt uuid; blocked boolean; payload jsonb;
begin
 insert into auth.users(id,is_anonymous,raw_app_meta_data) values(u,false,'{"role":"admin"}');
 perform set_config('role','service_role',true);
 c:=public.mqd_contest_create(u,'Fixture contest','Test only',now()+interval '1 day','[{"label":"A","preview":"data:image/png;base64,AAAA"},{"label":"B","preview":"data:image/png;base64,AAAA"}]');
 select id into opt from public.mqd_contest_options where contest_id=c order by position limit 1;
 if not public.mqd_contest_vote(c,opt,'test-browser','test-network') then raise exception 'FAIL first vote'; end if;
 if public.mqd_contest_vote(c,opt,'test-browser','test-network') then raise exception 'FAIL duplicate vote'; end if;
 payload:=public.mqd_contest_public(c,false);
 if (payload->>'total')::int!=1 or payload::text like '%user_id%' or payload::text like '%voter_hash%' or payload::text like '%preview%' then raise exception 'FAIL results privacy'; end if;
 blocked:=false;begin perform public.mqd_contest_vote(c,gen_random_uuid(),'another-browser','test-network');exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL invalid option';end if;
 update public.mqd_contests set closes_at=now()-interval '1 second' where id=c;
 blocked:=false;begin perform public.mqd_contest_vote(c,opt,'another-browser','test-network');exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL closed vote';end if;
 if has_table_privilege('anon','public.mqd_contests','SELECT') or has_table_privilege('authenticated','public.mqd_contests','INSERT') or has_function_privilege('anon','public.mqd_contest_create(uuid,text,text,timestamptz,jsonb)','EXECUTE') then raise exception 'FAIL client privileges';end if;
 raise notice 'PASS owner contest creation, vote counting, duplicates, closing, options and private data';
end $$;
rollback;
