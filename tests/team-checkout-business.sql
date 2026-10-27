begin;
do $$declare actual jsonb;expected jsonb;begin
 if has_function_privilege('anon','mqd_team_checkout_business(uuid)','execute') or has_function_privilege('authenticated','mqd_team_checkout_business(uuid)','execute') then raise exception 'Public business access';end if;
 if mqd_team_checkout_business(gen_random_uuid()) is not null then raise exception 'Missing business exposed';end if;
 select mqd_team_checkout_business(id),jsonb_build_object('status',status,'pilot_kind',shop_config->>'pilotKind','published_shop',shop_config->'ownerPublished'->'shop','publication_authorized_by',shop_config->'ownerPublished'->>'authorizedBy','publication_master_ids',shop_config->'ownerPublished'->'masterVersionIds','publication_waived',shop_config->'ownerPublished'->'organizerFeeWaived') into actual,expected from mqd_print_shop_businesses limit 1;
 if actual is distinct from expected then raise exception 'Business projection changed authorization fields';end if;
end$$;
set local role service_role;
select mqd_team_checkout_business(gen_random_uuid());
rollback;
