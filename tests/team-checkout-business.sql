begin;
do $$declare actual jsonb;expected jsonb;begin
 if has_function_privilege('anon','mqd_team_checkout_business(uuid)','execute') or has_function_privilege('authenticated','mqd_team_checkout_business(uuid)','execute') then raise exception 'Public business access';end if;
 if has_table_privilege('anon','mqd_team_checkout_business_cache','select') or has_table_privilege('authenticated','mqd_team_checkout_business_cache','select') then raise exception 'Public cache access';end if;
 if mqd_team_checkout_business(gen_random_uuid()) is not null then raise exception 'Missing business exposed';end if;
 select mqd_team_checkout_business(id),jsonb_build_object('status',status,'owner_managed',shop_config->'ownerManaged','pilot_kind',shop_config->>'pilotKind','published_shop',(shop_config->'ownerPublished'->'shop')-'logo'-case when exists(select 1 from jsonb_each(shop_config->'ownerPublished'->'shop'->'garments') g where coalesce(g.value->'logoPreset'->>'mode','none')<>'none') then '__unused__' else 'garmentLogo' end,'publication_authorized_by',shop_config->'ownerPublished'->>'authorizedBy','publication_master_ids',shop_config->'ownerPublished'->'masterVersionIds','publication_waived',shop_config->'ownerPublished'->'organizerFeeWaived') into actual,expected from mqd_print_shop_businesses limit 1;
 if actual is distinct from expected then raise exception 'Business projection changed authorization fields';end if;
end$$;
do $$declare team uuid:=gen_random_uuid();before_key uuid;after_key uuid;r jsonb;begin
 insert into mqd_print_shop_businesses(id,status,shop_config) values(team,'active','{"ownerManaged":true,"pilotKind":"team","ownerPublished":{"authorizedBy":"synthetic-owner","organizerFeeWaived":true,"masterVersionIds":{"tshirt":"synthetic"},"shop":{"logo":"branding-original","garmentLogo":"full-original","garments":{"tshirt":{"logoPreset":{"mode":"none"}}}}}}');
 r:=mqd_team_checkout_business(team);
 if r->'published_shop' ? 'logo' or r->'published_shop' ? 'garmentLogo' then raise exception 'Unused branding transferred';end if;
 if (select shop_config->'ownerPublished'->'shop'->>'garmentLogo' from mqd_print_shop_businesses where id=team)<>'full-original' then raise exception 'Source changed';end if;
 select checkout_projection_key into before_key from mqd_print_shop_businesses where id=team;
 update mqd_print_shop_businesses set status='closed' where id=team;
 select checkout_projection_key into after_key from mqd_print_shop_businesses where id=team;
 if before_key=after_key or exists(select 1 from mqd_team_checkout_business_cache where team_id=team) then raise exception 'Stale status cache';end if;
 -- A late insert from an in-flight read must not become authoritative.
 insert into mqd_team_checkout_business_cache values(team,before_key,r);
 if mqd_team_checkout_business(team)->>'status'<>'closed' then raise exception 'Old generation accepted';end if;
 update mqd_print_shop_businesses set shop_config=jsonb_set(shop_config,'{ownerPublished,shop,garments,tshirt,logoPreset,mode}','"fixed"') where id=team;
 if mqd_team_checkout_business(team)->'published_shop'->>'garmentLogo'<>'full-original' then raise exception 'Flexible original omitted';end if;
 update mqd_print_shop_businesses set shop_config=shop_config-'ownerPublished' where id=team;
 if mqd_team_checkout_business(team)->'published_shop'<>'null'::jsonb then raise exception 'Unpublished cache retained';end if;
end$$;
set local role service_role;
select mqd_team_checkout_business(gen_random_uuid());
rollback;
