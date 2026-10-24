begin;
do $$
declare team uuid:=gen_random_uuid();v1 uuid:=gen_random_uuid();v2 uuid:=gen_random_uuid();r jsonb;failed boolean;product text;begin
 if has_table_privilege('anon','public.mqd_team_garment_master_drafts','select') or has_table_privilege('authenticated','public.mqd_team_garment_master_drafts','update') or has_function_privilege('authenticated','public.mqd_save_owner_garment_master(uuid,text,integer,jsonb,boolean,uuid)','execute') then raise exception 'Public garment master access';end if;
 if not exists(select 1 from pg_proc where oid='public.mqd_save_owner_garment_master(uuid,text,integer,jsonb,boolean,uuid)'::regprocedure and not prosecdef and proconfig @> array['statement_timeout=60s']) then raise exception 'Garment master timeout/invoker protection missing';end if;
 insert into public.mqd_print_shop_businesses(id,preferred_slug,shop_config) values(team,'garment-fixture','{"ownerManaged":true,"editingMode":"strict"}');
 insert into public.mqd_team_accounts(team_id,shop_config,status) values(team,'{}','ready');
 perform public.mqd_save_team_master(team,0,'{"name":"Tee","payload":{"product":{"id":"tshirt"}},"rules":[]}',false,gen_random_uuid());
 foreach product in array array['long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie'] loop
  r:=public.mqd_save_owner_garment_master(team,product,0,jsonb_build_object('name',product,'payload',jsonb_build_object('product',jsonb_build_object('id',product)),'rules','[]'::jsonb),false,gen_random_uuid());
  if (r->>'revision')::int<>1 or r->>'versionId' is not null then raise exception 'Draft published early';end if;
  failed:=false;begin perform public.mqd_save_owner_garment_master(team,product,0,'{}',false,gen_random_uuid());exception when others then failed:=true;end;if not failed then raise exception 'Stale garment overwrite';end if;
 end loop;
 if (select revision from public.mqd_team_master_drafts where team_id=team)<>1 or (select count(*) from public.mqd_team_garment_master_drafts where team_id=team)<>4 then raise exception 'Garment writes not isolated';end if;
 failed:=false;begin perform public.mqd_save_owner_garment_master(team,'tshirt',0,'{"payload":{"product":{"id":"tshirt"}}}',false,gen_random_uuid());exception when others then failed:=true;end;if not failed then raise exception 'Primary master shadowed';end if;
 r:=public.mqd_save_owner_garment_master(team,'long-sleeve-tshirt',1,'{"name":"Long sleeve v1","payload":{"product":{"id":"long-sleeve-tshirt"}},"rules":[]}',true,v1);
 perform public.mqd_save_owner_garment_master(team,'long-sleeve-tshirt',2,'{"name":"Long sleeve v2","payload":{"product":{"id":"long-sleeve-tshirt"}},"rules":[]}',true,v2);
 if (select version_id from public.mqd_team_garment_master_drafts where team_id=team and product_id='long-sleeve-tshirt')<>v2 or (select name from public.mqd_team_master_versions where id=v1)<>'Long sleeve v1' or (select master_version_id from public.mqd_team_accounts where team_id=team) is not null then raise exception 'Published garment versions not independent';end if;
 failed:=false;begin update public.mqd_team_master_versions set name='tamper' where id=v1;exception when others then failed:=true;end;if not failed then raise exception 'Mutable garment version';end if;
 update public.mqd_print_shop_businesses set shop_config='{"ownerManaged":false}' where id=team;
 failed:=false;begin perform public.mqd_save_owner_garment_master(team,'long-sleeve-tshirt',3,'{}',false,gen_random_uuid());exception when others then failed:=true;end;if not failed then raise exception 'Regular workspace accessed owner staging';end if;
end$$;
select 'PASS private per-garment drafts, independent revisions, immutable versions, primary compatibility, scoped timeout and owner-only staging' as verification;
rollback;
