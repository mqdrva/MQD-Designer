begin;
do $$
declare team uuid:=gen_random_uuid();payer uuid:=gen_random_uuid();version uuid:=gen_random_uuid();failed boolean;shop jsonb;o jsonb;a mqd_team_accounts;
begin
 if has_function_privilege('anon','mqd_bind_owner_organizer(uuid,uuid,text,integer,text)','execute') or has_function_privilege('authenticated','mqd_bind_owner_organizer(uuid,uuid,text,integer,text)','execute') then raise exception 'Public organizer binding';end if;
 shop:=jsonb_build_object('ownerManaged',true,'pilotKind','team','organizerAccess',jsonb_build_object('enabled',false,'rewardQuantity',5),'ownerPublished',jsonb_build_object('organizerFeeWaived',true,'authorizedBy',gen_random_uuid(),'masterVersionIds',jsonb_build_object('tshirt',version),'shop',jsonb_build_object('garments',jsonb_build_object('tshirt','{}'::jsonb))));
 insert into mqd_print_shop_businesses(id,owner_email,shop_config) values(team,'organizer@example.invalid',shop);
 insert into mqd_team_accounts(team_id,shop_config) values(team,shop);
 insert into mqd_team_master_versions(id,team_id,name,payload,rules) values(version,team,'Synthetic','{"product":{"id":"tshirt"}}','[]');
 failed:=false;begin perform mqd_bind_owner_organizer(team,payer,'organizer@example.invalid',5,'2026-10-25-owner');exception when others then failed:=true;end;if not failed then raise exception 'Default-off bypass';end if;
 update mqd_print_shop_businesses set shop_config=jsonb_set(shop_config,'{organizerAccess,enabled}','true') where id=team;
 failed:=false;begin perform mqd_bind_owner_organizer(team,payer,'other@example.invalid',5,'2026-10-25-owner');exception when others then failed:=true;end;if not failed then raise exception 'Wrong organizer allowed';end if;
 failed:=false;begin perform mqd_bind_owner_organizer(team,payer,'organizer@example.invalid',10,'2026-10-25-owner');exception when others then failed:=true;end;if not failed then raise exception 'Wrong terms allowed';end if;
 a:=mqd_bind_owner_organizer(team,payer,'organizer@example.invalid',5,'2026-10-25-owner');
 if a.organizer_user_id<>payer or a.reward_quantity<>5 then raise exception 'Binding failed';end if;
 failed:=false;begin perform mqd_bind_owner_organizer(team,gen_random_uuid(),'organizer@example.invalid',5,'2026-10-25-owner');exception when others then failed:=true;end;if not failed then raise exception 'Payer replaced';end if;
 o:=jsonb_build_object('id',gen_random_uuid(),'team_id',team,'request_hash','synthetic','guest_token_hash','synthetic','livemode',false,'delivery','individual','quantity',1,'garment_cents',4000,'shipping_cents',1000,'summary',jsonb_build_object('productId','tshirt','master',jsonb_build_object('versionId',version)));
 perform mqd_reserve_team_order(o); -- An unfinished signup does not stop the free preview.
 update mqd_team_accounts set stripe_subscription_id='sub_synthetic',status='active',billing_status='active',period_end=now()+interval '30 days' where team_id=team;
 perform mqd_reserve_team_order(o||jsonb_build_object('id',gen_random_uuid()));
 update mqd_team_accounts set billing_status='past_due' where team_id=team;
 failed:=false;begin perform mqd_reserve_team_order(o||jsonb_build_object('id',gen_random_uuid()));exception when others then failed:=true;end;if not failed then raise exception 'Old waiver bypassed failed renewal';end if;
 update mqd_team_accounts set billing_status='active',period_end=now()-interval '1 day' where team_id=team;
 failed:=false;begin perform mqd_reserve_team_order(o||jsonb_build_object('id',gen_random_uuid()));exception when others then failed:=true;end;if not failed then raise exception 'Expired subscription bypass';end if;
 if (select count(*) from mqd_team_orders where team_id=team)<>2 then raise exception 'Existing orders changed';end if;
end$$;
select 'PASS organizer binding, off-by-default, immutable payer/terms, private grants, free-to-paid transition, failed/expired renewal denial, preserved orders' as verification;
rollback;
