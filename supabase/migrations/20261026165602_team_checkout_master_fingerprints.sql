begin;
-- The stored immutable version is untouched. Only the service can request this
-- transient checkout projection; public/member reads retain their existing API.
create function public.mqd_team_checkout_master(p_team uuid,p_version uuid)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare v public.mqd_team_master_versions;result jsonb;zone record;layer jsonb;i integer;source text;
begin
 select * into v from public.mqd_team_master_versions where team_id=p_team and id=p_version;
 if not found then return null;end if;
 result:=to_jsonb(v);
 for zone in select key,value from jsonb_each(v.payload->'design'->'zones') loop
  i:=0;
  for layer in select value from jsonb_array_elements(zone.value->'layers') loop
   if layer->>'type'='image' then
    source:=layer->>'src';
    if source is null or source !~ '^data:image/(png|jpeg|webp);base64,' then raise exception 'Master original source unavailable';end if;
    result:=jsonb_set(result,array['payload','design','zones',zone.key,'layers',i::text,'src'],to_jsonb('sha256:'||encode(sha256(convert_to(source,'UTF8')),'hex')));
   end if;
   i:=i+1;
  end loop;
 end loop;
 return result;
end$$;
revoke all on function public.mqd_team_checkout_master(uuid,uuid) from public,anon,authenticated;
grant execute on function public.mqd_team_checkout_master(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
