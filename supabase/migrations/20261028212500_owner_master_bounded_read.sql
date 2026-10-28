begin;
create function public.mqd_read_team_master_part(p_team uuid,p_product text,p_revision integer,p_part integer)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare d jsonb;r integer;v uuid;t text;n integer;
begin
 if p_part is null or p_part<0 or p_part>25 then raise exception 'Invalid master part';end if;
 if p_product is null then select draft,revision into d,r from public.mqd_team_master_drafts where team_id=p_team;
 else select draft,revision,version_id into d,r,v from public.mqd_team_garment_master_drafts where team_id=p_team and product_id=p_product;end if;
 if d is null then return null;end if;
 if p_revision is not null and r<>p_revision then raise exception 'Master changed. Reopen the saved draft.';end if;
 t:=d::text;n:=ceil(length(t)::numeric/2097152)::integer;
 if n>26 or p_part>=n then raise exception 'Invalid master part';end if;
 return jsonb_build_object('revision',r,'versionId',v,'parts',n,'text',substring(t from p_part*2097152+1 for 2097152));
end $$;
revoke all on function public.mqd_read_team_master_part(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.mqd_read_team_master_part(uuid,text,integer,integer) to service_role;
commit;
