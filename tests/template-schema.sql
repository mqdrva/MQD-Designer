-- Run after the exact staged migration, never against production.
do $$ begin
 if not (select relrowsecurity from pg_class where oid='public.mqd_shirt_templates'::regclass) then raise exception 'Template RLS missing';end if;
 if not (select relrowsecurity from pg_class where oid='public.mqd_shirt_template_versions'::regclass) then raise exception 'Version RLS missing';end if;
 if has_table_privilege('anon','public.mqd_shirt_templates','SELECT') or has_table_privilege('authenticated','public.mqd_shirt_template_versions','SELECT') then raise exception 'Private template tables exposed';end if;
 if has_table_privilege('authenticated','public.mqd_shirt_templates','UPDATE') or has_table_privilege('authenticated','public.mqd_shirt_template_versions','INSERT') then raise exception 'Owner publishing bypass';end if;
 if has_table_privilege('service_role','public.mqd_shirt_template_versions','UPDATE') or has_table_privilege('service_role','public.mqd_shirt_template_versions','DELETE') then raise exception 'Mutable published versions';end if;
 if (select public from storage.buckets where id='mqd-template-drafts') then raise exception 'Draft assets public';end if;
 if not (select public from storage.buckets where id='mqd-template-published') then raise exception 'Published assets not durable public objects';end if;
 if not has_table_privilege('authenticated','public.customer_designs','SELECT') or has_table_privilege('anon','public.customer_designs','SELECT') then raise exception 'Existing customer permissions changed';end if;
end $$;
set role anon;
do $$ begin
 begin perform * from public.mqd_shirt_templates;raise exception 'Anonymous draft access allowed';exception when insufficient_privilege then null;end;
 begin insert into public.mqd_shirt_templates(owner_id,draft) values('00000000-0000-4000-8000-000000000001','{}');raise exception 'Anonymous publishing allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set role authenticated;
do $$ begin
 begin perform * from public.mqd_shirt_template_versions;raise exception 'Raw version access allowed';exception when insufficient_privilege then null;end;
 if (select count(*) from public.customer_designs)<>0 then raise exception 'Another customer source exposed';end if;
end $$;
reset role;
set role service_role;
insert into public.mqd_shirt_templates(id,owner_id,draft) values('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','{"name":"Draft"}');
insert into public.mqd_shirt_template_versions(id,template_id,snapshot) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','{"name":"Approved v1"}');
update public.mqd_shirt_templates set published_version_id='30000000-0000-4000-8000-000000000001' where id='20000000-0000-4000-8000-000000000001';
update public.mqd_shirt_templates set draft='{"name":"Changed draft"}',published_version_id=null where id='20000000-0000-4000-8000-000000000001';
do $$ begin if (select snapshot->>'name' from public.mqd_shirt_template_versions where id='30000000-0000-4000-8000-000000000001')<>'Approved v1' then raise exception 'Existing version was rewritten';end if;end $$;
reset role;
-- Even an accidental privileged UPDATE cannot silently rewrite the historical version.
do $$ begin
 begin update public.mqd_shirt_template_versions set snapshot='{}';raise exception 'Version trigger did not reject update';
 exception when raise_exception then if sqlerrm<>'Published template versions are immutable' then raise;end if;end;
end $$;
select 'PASS isolated PostgreSQL: RLS, grants, customer privacy, immutable versions and unpublish preservation' as result;
