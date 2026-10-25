begin;
do $$
declare team uuid:=gen_random_uuid();actor uuid:=gen_random_uuid();product text;shop jsonb;expected jsonb:='{}';r jsonb;v uuid;failed boolean;o jsonb;begin
 if has_function_privilege('anon','mqd_publish_owner_saved_masters(uuid,integer,jsonb,jsonb,boolean,uuid)','execute') or has_function_privilege('authenticated','mqd_publish_owner_saved_masters(uuid,integer,jsonb,jsonb,boolean,uuid)','execute') then raise exception 'Public publication access';end if;
 shop:='{"ownerManaged":true,"editingMode":"strict","pilotKind":"team","garments":{"tshirt":{},"long-sleeve-tshirt":{},"short-sleeve-polo":{},"long-sleeve-polo":{},"fleece-hoodie":{}}}';
 insert into mqd_print_shop_businesses(id,shop_config) values(team,shop);
 insert into mqd_team_accounts(team_id,shop_config) values(team,shop);
 perform mqd_save_team_master(team,0,'{"name":"Tee","payload":{"product":{"id":"tshirt"}},"rules":[]}',false,gen_random_uuid());
 expected:='{"tshirt":1}';
 foreach product in array array['long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie'] loop
 perform mqd_save_owner_garment_master(team,product,0,jsonb_build_object('name',product,'payload',jsonb_build_object('product',jsonb_build_object('id',product),'original','unaltered-pixels'),'rules','[]'::jsonb),false,gen_random_uuid());expected:=expected||jsonb_build_object(product,1);
 end loop;
 failed:=false;begin perform mqd_publish_owner_saved_masters(team,1,expected||'{"tshirt":0}',shop,true,actor);exception when others then failed:=true;end;
 if not failed or exists(select 1 from mqd_team_master_versions where team_id=team) then raise exception 'Partial stale publication';end if;
 r:=mqd_publish_owner_saved_masters(team,1,expected,shop,true,actor);
 if (select count(*) from mqd_team_master_versions where team_id=team)<>5 or (select revision from mqd_team_master_drafts where team_id=team)<>1 or exists(select 1 from mqd_team_garment_master_drafts where team_id=team and revision<>1) then raise exception 'Saved drafts changed';end if;
 if (select billing_status from mqd_team_accounts where team_id=team) is not null then raise exception 'Billing changed';end if;
 v:=(r->'masterVersionIds'->>'fleece-hoodie')::uuid;
 if (select payload->>'original' from mqd_team_master_versions where id=v)<>'unaltered-pixels' then raise exception 'Original changed';end if;
 o:=jsonb_build_object('id',gen_random_uuid(),'team_id',team,'request_hash','synthetic','guest_token_hash','synthetic','livemode',false,'delivery','individual','quantity',1,'garment_cents',5000,'shipping_cents',1000,'summary',jsonb_build_object('productId','fleece-hoodie','master',jsonb_build_object('versionId',v)));
 perform mqd_reserve_team_order(o);
 if (select count(*) from mqd_team_orders where team_id=team)<>1 then raise exception 'Waived individual order failed';end if;
 failed:=false;begin perform mqd_reserve_team_order(o||jsonb_build_object('id',gen_random_uuid(),'delivery','team'));exception when others then failed:=true;end;if not failed then raise exception 'Unpaid batch enabled';end if;
 failed:=false;begin perform mqd_reserve_team_order(o||jsonb_build_object('id',gen_random_uuid(),'livemode',true));exception when others then failed:=true;end;if not failed then raise exception 'Wrong payment mode allowed';end if;
 update mqd_print_shop_businesses set shop_config=shop_config-'ownerPublished' where id=team;
 failed:=false;begin perform mqd_reserve_team_order(o||jsonb_build_object('id',gen_random_uuid()));exception when others then failed:=true;end;if not failed then raise exception 'Unpublished checkout allowed';end if;
end$$;
select 'PASS atomic saved publication, immutable originals, unchanged revisions, private grants, waived organizer individual checkout, mode/batch/unpublished denial' as verification;
rollback;
