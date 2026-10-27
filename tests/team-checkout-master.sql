begin;
do $$
declare team uuid:=gen_random_uuid();version uuid:=gen_random_uuid();payload jsonb;compact jsonb;original text:='data:image/png;base64,SYNTHETIC';
begin
 if has_function_privilege('anon','mqd_team_checkout_master(uuid,uuid)','execute') or has_function_privilege('authenticated','mqd_team_checkout_master(uuid,uuid)','execute') then raise exception 'Public snapshot access';end if;
 insert into mqd_print_shop_businesses(id,shop_config) values(team,'{}');insert into mqd_team_accounts(team_id,shop_config) values(team,'{}');
 payload:=jsonb_build_object('product',jsonb_build_object('id','tshirt'),'design',jsonb_build_object('zones',jsonb_build_object('Front',jsonb_build_object('layers',jsonb_build_array(jsonb_build_object('id','logo','type','image','src',original,'x',12,'scale',0.4),jsonb_build_object('id','name','type','text','text','NAME'))))));
 insert into mqd_team_master_versions(id,team_id,name,payload,rules) values(version,team,'Synthetic',payload,'[{"layerId":"name","role":"text","allowMove":true}]');
 compact:=mqd_team_checkout_master(team,version);
 if compact->'payload'->'design'->'zones'->'Front'->'layers'->0->>'src' <> 'sha256:'||encode(sha256(convert_to(original,'UTF8')),'hex') then raise exception 'Wrong source fingerprint';end if;
 if compact->'payload'->'design'->'zones'->'Front'->'layers'->1 <> payload->'design'->'zones'->'Front'->'layers'->1 or compact->'rules'<>'[{"layerId":"name","role":"text","allowMove":true}]'::jsonb then raise exception 'Layer/permissions changed';end if;
 if mqd_team_checkout_master(team,version)<>compact then raise exception 'Cache altered projection';end if;
 if not exists(select 1 from mqd_team_checkout_projections where version_id=version and team_id=team) then raise exception 'Projection not cached';end if;
 if has_table_privilege('anon','mqd_team_checkout_projections','select') or has_table_privilege('authenticated','mqd_team_checkout_projections','select') then raise exception 'Public cache access';end if;
 update mqd_team_master_versions set name='Updated synthetic' where id=version;
 if exists(select 1 from mqd_team_checkout_projections where version_id=version) then raise exception 'Stale projection retained';end if;
 if mqd_team_checkout_master(team,version)->>'name'<>'Updated synthetic' then raise exception 'Stale name';end if;
 if (select v.payload from mqd_team_master_versions v where v.id=version)<>payload then raise exception 'Stored master changed';end if;
 if mqd_team_checkout_master(gen_random_uuid(),version) is not null or mqd_team_checkout_master(team,gen_random_uuid()) is not null then raise exception 'Foreign master accessed';end if;
end$$;
select 'PASS service-only transient master fingerprints: exact UTF8 source SHA256, unchanged protected fields/text rules/stored master, cross-team denial' as verification;
rollback;
