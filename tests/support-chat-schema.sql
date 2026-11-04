begin;
do $$
declare c uuid='11111111-1111-4111-8111-111111111111'; r uuid='22222222-2222-4222-8222-222222222222'; m jsonb; n jsonb;
begin
 if has_table_privilege('anon','public.mqd_support_conversations','select') or has_table_privilege('authenticated','public.mqd_support_messages','select') then raise exception 'public access'; end if;
 if has_function_privilege('anon','public.mqd_support_send(uuid,text,uuid,text,boolean,boolean)','execute') then raise exception 'public RPC'; end if;
 m:=public.mqd_support_send(c,repeat('a',64),r,'<img src=x onerror=alert(1)>',false,true);
 n:=public.mqd_support_send(c,repeat('a',64),r,'<img src=x onerror=alert(1)>',false,true);
 if m->>'seq'<>n->>'seq' then raise exception 'duplicate message'; end if;
 if (select count(*) from public.mqd_support_notifications where conversation_id=c)<>1 then raise exception 'duplicate notification'; end if;
 begin
  perform public.mqd_support_send(c,repeat('b',64),gen_random_uuid(),'bad',false,true);
  raise exception 'ISOLATION FAILED';
 exception when others then if sqlerrm<>'unavailable' then raise; end if; end;
 begin
  perform public.mqd_support_send(c,repeat('a',64),r,'changed',false,false);
  raise exception 'IDEMPOTENCY FAILED';
 exception when others then if sqlerrm<>'conflict' then raise; end if; end;
 perform public.mqd_support_seen(c,(m->>'seq')::bigint,false);
 perform public.mqd_support_seen(c,0,false);
 if (select customer_seen from public.mqd_support_conversations where id=c)<>(m->>'seq')::bigint then raise exception 'read marker regressed'; end if;
 if (select count(*) from public.mqd_support_claim(c))<>1 then raise exception 'claim missing'; end if;
 if (select count(*) from public.mqd_support_claim(c))<>0 then raise exception 'concurrent claim'; end if;
 update public.mqd_support_notifications set first_attempt_at=now()-interval '24 hours',lease_until=null where conversation_id=c;
 if (select count(*) from public.mqd_support_claim(c))<>0 then raise exception 'expired retry'; end if;
 if (select status from public.mqd_support_notifications where conversation_id=c)<>'review' then raise exception 'missing manual review'; end if;
end $$;
rollback;
