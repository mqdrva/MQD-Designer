begin;
set local role service_role;
do $$
declare owner_uuid uuid; cid uuid:=gen_random_uuid(); other_cid uuid:=gen_random_uuid(); opt uuid:=gen_random_uuid(); opt2 uuid:=gen_random_uuid(); regular uuid:=gen_random_uuid(); ropt uuid:=gen_random_uuid(); network text:='rollback-network-'||gen_random_uuid(); denied boolean; message text;
begin
 select owner_id into owner_uuid from public.mqd_monthly_config;
 insert into public.mqd_contests(id,user_id,title,closes_at,opens_at,announces_at,round_month)
 values(cid,owner_uuid,'ROLLBACK ONLY cooldown test',now()+interval '1 hour',now()-interval '1 day',now()+interval '2 hours','2199-01-01'),
 (other_cid,owner_uuid,'ROLLBACK ONLY other round',now()+interval '1 hour',now()-interval '1 day',now()+interval '2 hours','2199-02-01'),
 (regular,owner_uuid,'ROLLBACK ONLY non-monthly',now()+interval '1 hour',null,null,null);
 insert into public.mqd_contest_options(id,contest_id,label,preview,position) values
 (opt,cid,'One','data:image/png;base64,aA==',0),(opt2,other_cid,'Two','data:image/png;base64,aA==',0),(ropt,regular,'Regular','data:image/png;base64,aA==',0);
 if not public.mqd_contest_vote(cid,opt,'browser-a',network) then raise exception 'First vote failed'; end if;
 if public.mqd_contest_vote(cid,opt,'browser-a',network) then raise exception 'Browser retry counted'; end if;
 if public.mqd_contest_vote(cid,opt,'browser-a',network||'-changed') then raise exception 'Network change bypassed browser limit'; end if;
 denied:=false;
 begin perform public.mqd_contest_vote(cid,opt,'incognito-b',network);
 exception when others then get stacked diagnostics message=message_text;denied:=message like '%try again in 300 seconds%';end;
 if not denied then raise exception 'Incognito cooldown failed'; end if;
 if not public.mqd_contest_vote(cid,opt,'browser-c',network||'-other') then raise exception 'Independent voter blocked'; end if;
 if not public.mqd_contest_vote(other_cid,opt2,'browser-d',network) then raise exception 'Cooldown leaked across monthly rounds'; end if;
 update public.mqd_contest_votes set created_at=now()-interval '299 seconds' where contest_id=cid and voter_hash='browser-a';
 denied:=false;
 begin perform public.mqd_contest_vote(cid,opt,'incognito-b',network);
 exception when others then get stacked diagnostics message=message_text;denied:=message like '%try again in 1 seconds%';end;
 if not denied then raise exception 'Cooldown expired too early'; end if;
 update public.mqd_contest_votes set created_at=now()-interval '5 minutes' where contest_id=cid and voter_hash='browser-a';
 if not public.mqd_contest_vote(cid,opt,'browser-b',network) then raise exception 'Household voter blocked after cooldown'; end if;
 if (select count(*) from public.mqd_contest_votes where contest_id=cid)!=3 then raise exception 'Unexpected vote total'; end if;
 if not public.mqd_contest_vote(regular,ropt,'regular-a',network) or not public.mqd_contest_vote(regular,ropt,'regular-b',network) then raise exception 'Non-monthly behavior changed'; end if;
 update public.mqd_contests set closes_at=now()-interval '1 second' where id=cid;
 denied:=false;begin perform public.mqd_contest_vote(cid,opt,'late',network||'-late');exception when others then denied:=true;end;
 if not denied then raise exception 'Closed round accepted a vote'; end if;
 if has_function_privilege('anon','public.mqd_contest_vote(uuid,uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.mqd_contest_vote(uuid,uuid,text,text)','EXECUTE') then raise exception 'Public vote RPC exposed'; end if;
end $$;
rollback;
select 'First vote, browser deduplication, incognito cooldown, boundary, household, monthly isolation and permissions passed; fixtures rolled back.' result;
