begin;
do $$
declare team uuid:=gen_random_uuid();v1 uuid:=gen_random_uuid();v2 uuid:=gen_random_uuid();r jsonb;failed boolean;begin
 if has_table_privilege('anon','public.mqd_team_master_versions','select') or has_table_privilege('authenticated','public.mqd_team_master_drafts','update') or has_function_privilege('authenticated','public.mqd_save_team_master(uuid,integer,jsonb,boolean,uuid)','execute') then raise exception 'Public master access';end if;
 insert into public.mqd_print_shop_businesses(id,preferred_slug,plan,owner_email,owner_phone,shop_config,payload_hash,ip_hash,mail_origin,token_hash,token_cipher,token_expires_at,email_verified_at) values(team,'master-fixture','3d','test@example.invalid','2025550101','{"organizationType":"team"}',repeat('0',64),repeat('0',64),'local',repeat('0',64),'{}',now()+interval '1 day',now());
 insert into public.mqd_team_accounts(team_id,shop_config,status) values(team,'{}','ready');
 r:=public.mqd_save_team_master(team,0,'{"name":"First","payload":{"test":"original"},"rules":[]}',false,v1);
 if (r->>'revision')::int<>1 or exists(select 1 from public.mqd_team_master_versions where team_id=team) then raise exception 'Draft published early';end if;
 failed:=false;begin perform public.mqd_save_team_master(team,0,'{}',false,v1);exception when others then failed:=true;end;if not failed then raise exception 'Stale overwrite';end if;
 perform public.mqd_save_team_master(team,1,'{"name":"First","payload":{"test":"original"},"rules":[]}',true,v1);
 perform public.mqd_save_team_master(team,2,'{"name":"Second","payload":{"test":"new"},"rules":[]}',true,v2);
 if (select payload->>'test' from public.mqd_team_master_versions where id=v1)<>'original' or (select master_version_id from public.mqd_team_accounts where team_id=team)<>v2 then raise exception 'Historical snapshot changed';end if;
 failed:=false;begin update public.mqd_team_master_versions set name='tamper' where id=v1;exception when others then failed:=true;end;if not failed then raise exception 'Mutable version';end if;
 failed:=false;begin delete from public.mqd_team_master_versions where id=v1;exception when others then failed:=true;end;if not failed then raise exception 'Deleted version';end if;
end$$;
select 'PASS private drafts, stale-write denial, immutable historical masters, atomic publishing and denied public grants' as verification;
rollback;
