begin;
do $$
declare team uuid:=gen_random_uuid();version uuid:=gen_random_uuid();slug text:='read-cache-test';payload jsonb;r jsonb;m jsonb;body text;i integer;begin
 insert into mqd_print_shop_businesses(id,shop_config) values(team,jsonb_build_object('ownerManaged',true,'pilotKind','team','ownerPublished',jsonb_build_object('shop',jsonb_build_object('garments',jsonb_build_object('tshirt','{}'::jsonb)),'masterVersionIds',jsonb_build_object('tshirt',version))));
 insert into mqd_team_accounts(team_id,shop_config,livemode) values(team,jsonb_build_object('ownerManaged',true,'slug',slug),false);
 payload:=jsonb_build_object('product',jsonb_build_object('id','tshirt'),'design',jsonb_build_object('zones',jsonb_build_object('Front',jsonb_build_object('layers',jsonb_build_array(jsonb_build_object('type','image','src',repeat('x',5000000)))))));
 update mqd_print_shop_businesses set shop_config=jsonb_set(shop_config,'{ownerPublished,shop,garmentLogo}',to_jsonb(repeat('x',5000000))) where id=team;
 insert into mqd_team_master_versions(id,team_id,name,payload,rules) values(version,team,'Cache test',payload,'[]');
 execute 'set local role service_role';
 if has_table_privilege('anon','mqd_master_read_cache','select') or has_function_privilege('authenticated','mqd_read_owner_team_public_part(text,boolean,text,uuid,integer)','execute') then raise exception 'Public cache access';end if;
 r:=mqd_read_owner_team_public_part(slug,false,'tshirt',null,0);if r->'business'->'shop_config'->'ownerPublished'->'shop'->>'garmentLogo'<>'master-source:0' then raise exception 'Repeated original logo';end if;body:=r->'masterChunk'->>'text';
 for i in 1..(r->'masterChunk'->>'parts')::int-1 loop body:=body||(mqd_read_owner_team_public_part(slug,false,'tshirt',version,i)->'masterChunk'->>'text');end loop;
 m:=body::jsonb;if m->'sources'->>0 is distinct from repeat('x',5000000) then raise exception 'Original lost';end if;
 update mqd_print_shop_businesses set shop_config=shop_config-'ownerPublished' where id=team;
 r:=mqd_read_owner_team_public_part(slug,false,'tshirt',version,0);if r->'business'->'shop_config'->'ownerPublished'<>'null'::jsonb then raise exception 'Cached publication access';end if;
 update mqd_team_accounts set status='closed' where team_id=team;
 if mqd_read_owner_team_public_part(slug,false,'tshirt',version,0) is not null then raise exception 'Closed access';end if;
end $$;
rollback;
