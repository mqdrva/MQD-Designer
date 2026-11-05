begin;
do $$ begin
 if not (select relrowsecurity from pg_class where oid='public.mqd_print_shop_designs'::regclass) then raise exception 'Design RLS is required'; end if;
 if has_table_privilege('anon','public.mqd_print_shop_designs','select')
 or has_table_privilege('authenticated','public.mqd_print_shop_designs','select')
 or has_table_privilege('authenticated','public.mqd_print_shop_designs','update')
 then raise exception 'Public clients must not read or write private design records'; end if;
 if not has_table_privilege('service_role','public.mqd_print_shop_designs','select,insert,update') then raise exception 'Service permissions missing'; end if;
 if not exists(select 1 from storage.buckets where id='print-shop-designs' and public=false and file_size_limit=8388608) then raise exception 'Original ZIP bucket must stay private and bounded'; end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='mqd_print_shop_designs') then raise exception 'No public design enumeration policies allowed'; end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform * from public.mqd_print_shop_designs; raise exception 'Private select unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin update public.mqd_print_shop_designs set locked=false; raise exception 'Private update unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
