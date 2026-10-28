-- Preserve the existing master schema and atomic save/revision procedures.
-- A single unnamed bytea argument bypasses PostgREST's large JSON-argument
-- parser. This endpoint is internal only; the Edge function still validates
-- the owner, fresh MFA, garment, source bytes and permissions before calling it.
create or replace function public.mqd_save_team_master_bytes(bytea)
returns jsonb language plpgsql security invoker
set search_path=public set statement_timeout='60s' as $$
declare packet jsonb; product text;
begin
 if octet_length($1)>49*1024*1024 then raise exception 'Request is too large.'; end if;
 packet:=convert_from($1,'UTF8')::jsonb;
 if jsonb_typeof(packet)<>'object' or jsonb_typeof(packet->'p_draft')<>'object'
  or jsonb_typeof(packet->'p_publish')<>'boolean'
  or (packet->>'p_revision')::integer<0 then raise exception 'Invalid master save.'; end if;
 product:=packet->>'p_product';
 if product is not null and product is distinct from packet->'p_draft'->'payload'->'product'->>'id' then raise exception 'Garment mismatch.'; end if;
 if product is null then
  return public.mqd_save_team_master((packet->>'p_team')::uuid,(packet->>'p_revision')::integer,packet->'p_draft',(packet->>'p_publish')::boolean,(packet->>'p_version')::uuid);
 end if;
 return public.mqd_save_owner_garment_master((packet->>'p_team')::uuid,product,(packet->>'p_revision')::integer,packet->'p_draft',(packet->>'p_publish')::boolean,(packet->>'p_version')::uuid);
end $$;
revoke all on function public.mqd_save_team_master_bytes(bytea) from public,anon,authenticated;
grant execute on function public.mqd_save_team_master_bytes(bytea) to service_role;
notify pgrst,'reload schema';
