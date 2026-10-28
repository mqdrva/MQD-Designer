begin;
do $$
declare team uuid:=gen_random_uuid();packet jsonb;r jsonb;failed boolean;original text:=repeat('original-source-',1024*1024);begin
 if has_function_privilege('anon','public.mqd_save_team_master_bytes(bytea)','execute') or has_function_privilege('authenticated','public.mqd_save_team_master_bytes(bytea)','execute') then raise exception 'Public binary save access';end if;
 if (select prosecdef from pg_proc where oid='public.mqd_save_team_master_bytes(bytea)'::regprocedure) then raise exception 'Binary save bypasses invoker security';end if;
 insert into public.mqd_print_shop_businesses(id,shop_config) values(team,'{"ownerManaged":true,"editingMode":"strict"}');
 insert into public.mqd_team_accounts(team_id,shop_config) values(team,'{}');
 packet:=jsonb_build_object('p_team',team,'p_revision',0,'p_publish',false,'p_version',gen_random_uuid(),'p_product',null,'p_draft',jsonb_build_object('name','Unicode — 水','payload',jsonb_build_object('product',jsonb_build_object('id','tshirt'),'original',original),'rules','[]'::jsonb));
 r:=public.mqd_save_team_master_bytes(convert_to(packet::text,'UTF8'));
 if (r->>'revision')::int<>1 or r->>'versionId' is not null or exists(select 1 from public.mqd_team_master_versions where team_id=team) then raise exception 'Binary save published unexpectedly';end if;
 if (select draft->'payload'->>'original' from public.mqd_team_master_drafts where team_id=team) is distinct from original or (select draft->>'name' from public.mqd_team_master_drafts where team_id=team)<>'Unicode — 水' then raise exception 'Original or label changed';end if;
 failed:=false;begin perform public.mqd_save_team_master_bytes(convert_to(packet::text,'UTF8'));exception when others then failed:=true;end;if not failed then raise exception 'Stale binary save accepted';end if;
 packet:=jsonb_set(packet,'{p_draft,payload,product,id}','"fleece-hoodie"');packet:=jsonb_set(packet,'{p_product}','"fleece-hoodie"');
 r:=public.mqd_save_team_master_bytes(convert_to(packet::text,'UTF8'));if (r->>'revision')::int<>1 or (select revision from public.mqd_team_master_drafts where team_id=team)<>1 then raise exception 'Secondary save not independent';end if;
 packet:=jsonb_set(packet,'{p_product}','"tshirt"');failed:=false;begin perform public.mqd_save_team_master_bytes(convert_to(packet::text,'UTF8'));exception when others then failed:=true;end;if not failed then raise exception 'Binary garment mismatch accepted';end if;
 failed:=false;begin perform public.mqd_save_team_master_bytes(convert_to(repeat('x',49*1024*1024+1),'UTF8'));exception when others then failed:=true;end;if not failed then raise exception 'Oversized binary body accepted';end if;
end $$;
select 'PASS large raw master saves, exact originals/Unicode, private invoker grants, stale revisions, independent garments and bounded body' as verification;
rollback;
