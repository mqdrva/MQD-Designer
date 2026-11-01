begin;
-- Backend-only projection: draft originals once; no setup capabilities or duplicate publication artwork.
create function public.mqd_owner_workspace_part(p_team uuid,p_revision integer,p_part integer)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare r integer;status text;k text;c public.mqd_master_read_cache%rowtype;packet jsonb;shop jsonb;t text;n integer;i integer;
begin
 if p_part is null or p_part<0 or p_part>31 then raise exception 'Invalid workspace part';end if;
 select b.revision,b.status into r,status from public.mqd_print_shop_businesses b where b.id=p_team;
 if r is null then return null;end if;
 if status='closed' then raise exception 'Owner workspace unavailable';end if;
 if p_revision is not null and r<>p_revision then raise exception 'Workspace changed. Reopen before continuing.';end if;
 k:='workspace:'||p_team::text||':'||r::text;
 select * into c from public.mqd_master_read_cache where cache_key=k and part=p_part;
 if found then return jsonb_build_object('revision',r,'parts',c.parts,'text',c.body);end if;
 select jsonb_build_object('id',b.id,'status',b.status,'revision',b.revision,'owner_email',b.owner_email,'owner_phone',b.owner_phone,'shop_config',b.shop_config) into packet from public.mqd_print_shop_businesses b where b.id=p_team and b.revision=r;
 if packet is null then raise exception 'Workspace changed. Reopen before continuing.';end if;
 shop:=packet->'shop_config';
 if shop->>'ownerManaged' is distinct from 'true' then raise exception 'Owner workspace required';end if;
 if shop->'ownerPublished' is not null and shop->'ownerPublished'<>'null'::jsonb then shop:=(shop-'ownerPublished')||jsonb_build_object('ownerPublished',jsonb_build_object('organizerFeeWaived',shop->'ownerPublished'->'organizerFeeWaived'));end if;
 packet:=jsonb_set(packet,'{shop_config}',shop);t:=packet::text;n:=ceil(length(t)::numeric/2097152)::integer;
 if n>32 or p_part>=n then raise exception 'Workspace size unavailable';end if;
 delete from public.mqd_master_read_cache where cache_key like 'workspace:'||p_team::text||':%' and cache_key<>k;
 for i in 0..n-1 loop insert into public.mqd_master_read_cache values(k,i,substring(t from i*2097152+1 for 2097152),n) on conflict do nothing;end loop;
 return jsonb_build_object('revision',r,'parts',n,'text',substring(t from p_part*2097152+1 for 2097152));
end $$;
revoke all on function public.mqd_owner_workspace_part(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.mqd_owner_workspace_part(uuid,integer,integer) to service_role;
commit;
