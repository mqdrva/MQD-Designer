begin;
do $$
declare team uuid:=gen_random_uuid();u uuid:=gen_random_uuid();packet jsonb;body text;r jsonb;failed boolean;n integer;i integer;original text:=repeat('original-source-',3*1024*1024);begin
 if has_table_privilege('anon','public.mqd_master_uploads','select') or has_table_privilege('authenticated','public.mqd_master_upload_parts','insert') or has_function_privilege('anon','public.mqd_finish_master_upload(uuid)','execute') or has_function_privilege('authenticated','public.mqd_put_master_upload_part(uuid,integer,text)','execute') then raise exception 'Public staging access';end if;
 if exists(select 1 from pg_proc where proname in('mqd_begin_master_upload','mqd_put_master_upload_part','mqd_finish_master_upload','mqd_abort_master_upload') and prosecdef) then raise exception 'Staging bypasses invoker security';end if;
 insert into public.mqd_print_shop_businesses(id,shop_config) values(team,'{"ownerManaged":true,"editingMode":"strict"}');insert into public.mqd_team_accounts(team_id,shop_config) values(team,'{}');
 packet:=jsonb_build_object('p_team',team,'p_revision',0,'p_publish',false,'p_version',gen_random_uuid(),'p_product',null,'p_draft',jsonb_build_object('name','Unicode — 水','payload',jsonb_build_object('product',jsonb_build_object('id','tshirt'),'original',original),'rules','[]'::jsonb));
 -- ASCII is the transport encoding; test Unicode separately below.
 execute 'set local role service_role';
 body:=replace(replace(packet::text,'—','\u2014'),'水','\u6c34');n:=ceil(octet_length(body)/2097152.0);
 perform public.mqd_begin_master_upload(u,team,n,octet_length(body));
 failed:=false;begin perform public.mqd_finish_master_upload(u);exception when others then failed:=true;end;if not failed then raise exception 'Incomplete master committed';end if;
 for i in 0..n-1 loop perform public.mqd_put_master_upload_part(u,i,substring(body from i*2097152+1 for 2097152));end loop;
 perform public.mqd_put_master_upload_part(u,0,substring(body from 1 for 2097152));
 failed:=false;begin perform public.mqd_put_master_upload_part(u,0,repeat('x',2097152));exception when others then failed:=true;end;if not failed then raise exception 'Part overwrite accepted';end if;
 r:=public.mqd_finish_master_upload(u);if (r->>'revision')::int<>1 or r->>'versionId' is not null or exists(select 1 from public.mqd_team_master_versions where team_id=team) then raise exception 'Draft published';end if;
 if (select draft->'payload'->>'original' from public.mqd_team_master_drafts where team_id=team) is distinct from original or (select draft->>'name' from public.mqd_team_master_drafts where team_id=team)<>'Unicode — 水' then raise exception 'Original changed';end if;
 if exists(select 1 from public.mqd_master_uploads where id=u) or exists(select 1 from public.mqd_master_upload_parts where upload_id=u) then raise exception 'Stage not cleaned';end if;
 -- Stale writes remain atomic, leaving the existing revision intact.
 u:=gen_random_uuid();perform public.mqd_begin_master_upload(u,team,n,octet_length(body));for i in 0..n-1 loop perform public.mqd_put_master_upload_part(u,i,substring(body from i*2097152+1 for 2097152));end loop;
 failed:=false;begin perform public.mqd_finish_master_upload(u);exception when others then failed:=true;end;if not failed or (select revision from public.mqd_team_master_drafts where team_id=team)<>1 then raise exception 'Stale master overwritten';end if;perform public.mqd_abort_master_upload(u);
end $$;
select 'PASS 48 MiB master exact originals, Unicode, private grants, incomplete/duplicate/stale stages and atomic cleanup' as verification;
rollback;
