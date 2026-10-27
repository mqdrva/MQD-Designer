begin;
-- Decode the large setup once per read. Authorization is always fresh, never cached.
create or replace function public.mqd_team_checkout_business(p_team uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare b record;c record;p record;
begin
 select status,shop_config into b from public.mqd_print_shop_businesses where id=p_team;
 if not found then return null;end if;
 select * into c from jsonb_to_record(b.shop_config) as x("pilotKind" text,"ownerPublished" jsonb);
 select * into p from jsonb_to_record(coalesce(c."ownerPublished",'{}')) as x(shop jsonb,"authorizedBy" text,"masterVersionIds" jsonb,"organizerFeeWaived" jsonb);
 return jsonb_build_object('status',b.status,'pilot_kind',c."pilotKind",'published_shop',p.shop,'publication_authorized_by',p."authorizedBy",'publication_master_ids',p."masterVersionIds",'publication_waived',p."organizerFeeWaived");
end$$;
revoke all on function public.mqd_team_checkout_business(uuid) from public,anon,authenticated;
grant execute on function public.mqd_team_checkout_business(uuid) to service_role;
notify pgrst,'reload schema';
commit;
