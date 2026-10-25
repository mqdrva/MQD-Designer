begin;
grant insert on mqd_print_shop_businesses to service_role; -- Isolated parent fixture.
do $$
declare source_id uuid:=gen_random_uuid();target_id uuid:=gen_random_uuid();actor uuid:=gen_random_uuid();v uuid:=gen_random_uuid();failed boolean;result jsonb;shop jsonb;original jsonb;product text;target2 uuid;
begin
 if has_function_privilege('anon','mqd_duplicate_owner_team(uuid,uuid,integer,text,text,uuid,boolean)','execute') or has_function_privilege('authenticated','mqd_duplicate_owner_team(uuid,uuid,integer,text,text,uuid,boolean)','execute') then raise exception 'Public copy permission';end if;
 shop:='{"name":"Source Team","slug":"source-team","ownerManaged":true,"pilotKind":"team","editingMode":"strict","logo":"data:image/png;base64,ORIGINAL","engines":["3d"],"garments":{"tshirt":{"sizes":["S","5XL"]},"long-sleeve-tshirt":{},"short-sleeve-polo":{},"long-sleeve-polo":{},"fleece-hoodie":{}},"ownerRequest":{"designRequest":"Private source contact"},"organizerAccess":{"enabled":true,"rewardQuantity":10},"ownerPublished":{"organizerFeeWaived":true},"unknownPrivateField":"private"}';
 insert into mqd_print_shop_businesses(id,preferred_slug,plan,owner_email,owner_phone,shop_config,revision,mail_origin) values(source_id,'source-team','3d','source@example.invalid','5555555555',shop,7,'https://mymerchnow.app');
 insert into mqd_team_accounts(team_id,shop_config,organizer_user_id,reward_quantity,stripe_subscription_id,status,billing_status) values(source_id,shop,actor,10,'sub_source','active','active');
 original:='{"name":"Saved layout","payload":{"product":{"id":"tshirt"},"design":{"zones":{"Front":{"background":"#123456","layers":[{"id":"logo","src":"data:image/png;base64,ORIGINAL","x":22,"y":-31,"scale":0.35},{"id":"name","text":"NAME","x":-21,"y":-32}]}},"teamPermissions":{"wholeGarmentColor":true}}},"rules":[{"layerId":"logo","role":"locked"},{"layerId":"name","role":"text","allowMove":true}]}';
 insert into mqd_team_master_drafts(team_id,revision,draft) values(source_id,4,original);
 insert into mqd_team_master_versions(id,team_id,name,payload,rules) values(v,source_id,'Published',original->'payload',original->'rules');
 update mqd_team_accounts set master_version_id=v where team_id=source_id;
 foreach product in array array['long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie'] loop
 insert into mqd_team_garment_master_drafts(team_id,product_id,revision,draft,version_id) values(source_id,product,3,jsonb_set(original,'{payload,product,id}',to_jsonb(product)),v);
 end loop;
 insert into mqd_team_orders(id,team_id,quantity,payment_status) values(gen_random_uuid(),source_id,2,'paid');
 failed:=false;begin perform mqd_duplicate_owner_team(source_id,target_id,6,'New Team','new-team',actor,false);exception when others then failed:=true;end;if not failed or exists(select 1 from mqd_print_shop_businesses where id=target_id) then raise exception 'Stale copy created data';end if;
 failed:=false;begin perform mqd_duplicate_owner_team(source_id,target_id,7,'New Team','source-team',actor,false);exception when others then failed:=true;end;if not failed then raise exception 'Duplicate slug allowed';end if;
 result:=mqd_duplicate_owner_team(source_id,target_id,7,'New Team','new-team',actor,false);
 if (result->>'copiedDrafts')::int<>5 then raise exception 'Missing saved garments';end if;
 if (select draft from mqd_team_master_drafts where team_id=target_id) is distinct from original then raise exception 'Original pixels/placement/permissions changed';end if;
 if exists(select 1 from mqd_team_garment_master_drafts d join mqd_team_garment_master_drafts s on s.product_id=d.product_id and s.team_id=source_id where d.team_id=target_id and (d.draft<>s.draft or d.version_id is not null or d.revision<>1)) then raise exception 'Garment clone mismatch';end if;
 if exists(select 1 from mqd_team_accounts where team_id=target_id and (master_version_id is not null or organizer_user_id is not null or reward_quantity is not null or stripe_subscription_id is not null or billing_status<>'not_configured' or status<>'awaiting_review')) then raise exception 'Inherited access or billing';end if;
 select shop_config into shop from mqd_print_shop_businesses where id=target_id;
 if shop ? 'ownerPublished' or shop ? 'unknownPrivateField' or shop->'organizerAccess'<>'{"enabled":false,"rewardQuantity":5}'::jsonb or shop->>'name'<>'New Team' or shop->>'slug'<>'new-team' then raise exception 'Unsafe copied setup';end if;
 if (select owner_email||owner_phone from mqd_print_shop_businesses where id=target_id)<>'' then raise exception 'Contact inherited';end if;
 if exists(select 1 from mqd_team_orders where team_id=target_id) or exists(select 1 from mqd_team_master_versions where team_id=target_id) then raise exception 'Orders or publications copied';end if;
 -- Retrying a completed request must not create another team or reset edits.
 update mqd_team_master_drafts set draft=jsonb_set(draft,'{payload,design,zones,Front,background}','"#FFFFFF"'),revision=2 where team_id=target_id;
 result:=mqd_duplicate_owner_team(source_id,target_id,7,'New Team','new-team',actor,false);
 if result->>'recovered'<>'true' or (select revision from mqd_team_master_drafts where team_id=target_id)<>2 then raise exception 'Retry overwrote edits';end if;
 if (select draft from mqd_team_master_drafts where team_id=source_id)<>original or (select revision from mqd_print_shop_businesses where id=source_id)<>7 then raise exception 'Original changed';end if;
 failed:=false;begin perform mqd_duplicate_owner_team(source_id,target_id,7,'Other','new-team',actor,false);exception when others then failed:=true;end;if not failed then raise exception 'Retry mismatch accepted';end if;
 -- A failure after parent inserts rolls the entire copy back.
 update mqd_team_garment_master_drafts set draft='null'::jsonb where team_id=source_id and product_id='fleece-hoodie';
 -- A temporary destination-only constraint simulates a failed artwork insert.
 target2:=gen_random_uuid();
 execute format('alter table mqd_team_garment_master_drafts add constraint synthetic_copy_failure check(team_id<>%L::uuid)',target2);
 failed:=false;begin perform mqd_duplicate_owner_team(source_id,target2,7,'Atomic Team','atomic-team',actor,false);exception when others then failed:=true;end;
 if not failed or exists(select 1 from mqd_print_shop_businesses where id=target2) or exists(select 1 from mqd_team_accounts where team_id=target2) then raise exception 'Partial copy retained';end if;
 alter table mqd_team_garment_master_drafts drop constraint synthetic_copy_failure;
 update mqd_print_shop_businesses set shop_config=shop_config-'ownerManaged' where id=source_id;
 failed:=false;begin perform mqd_duplicate_owner_team(source_id,gen_random_uuid(),7,'Denied','denied-team',actor,false);exception when others then failed:=true;end;if not failed then raise exception 'Legacy source copied';end if;
end$$;
select 'PASS private atomic duplication: five independent exact drafts, locked/movable permissions, original preservation, no contacts/orders/billing/publication, stale/collision denial, retry recovery and rollback' as verification;
rollback;
